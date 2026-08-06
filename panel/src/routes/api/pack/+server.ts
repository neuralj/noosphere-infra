import { json } from '@sveltejs/kit';
import { readdir, readFile, rm, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { findRepoRoot } from '$lib/server/repo';
import {
	applyFindings,
	discover,
	generateTree,
	makeConfig,
	packProject,
	summarize
} from '$lib/server/code2llm';
import type { PackFormat, PackProfile } from '$lib/server/code2llm';

const REPO_ROOT = findRepoRoot();
const PACK_OUT_ROOT = join(REPO_ROOT, 'run', 'pack-out');
const PACK_KEEP_MAX = parseInt(process.env.PACK_KEEP_MAX ?? '30', 10) || 30;

function allowedRoots(): string[] {
	const extra = (process.env.ALLOWED_PACK_DIRS ?? '')
		.split(',')
		.map(s => s.trim())
		.filter(Boolean);
	return [REPO_ROOT, ...extra];
}

function assertAllowed(target: string): void {
	const resolved = resolve(target);
	for (const root of allowedRoots()) {
		const r = resolve(root);
		if (resolved === r || resolved.startsWith(r + '/')) return;
	}
	throw new Error(`Path not allowed: ${target}`);
}

function assertInsideOutDir(target: string): string {
	const resolved = resolve(target);
	const root = resolve(PACK_OUT_ROOT);
	if (!resolved.startsWith(root + '/')) {
		throw new Error(`Path not allowed: ${target}`);
	}
	return resolved;
}

function sanitizeSlug(name: string): string {
	return name.replace(/[^\w.-]/g, '-').replace(/^[.-]+/, '');
}

function contentTypeFor(file: string): string {
	const lower = file.toLowerCase();
	if (lower.endsWith('.md')) return 'text/markdown';
	if (lower.endsWith('.jsonl')) return 'application/x-ndjson';
	if (lower.endsWith('.json')) return 'application/json';
	if (lower.endsWith('.xml')) return 'application/xml';
	return 'text/plain';
}

function splitList(raw: string | null): string[] {
	return (raw ?? '')
		.split(',')
		.map(s => s.trim())
		.filter(Boolean);
}

async function listPackDirs(): Promise<{ name: string; mtime: string; mtimeMs: number }[]> {
	let dirs: { name: string; mtime: string; mtimeMs: number }[] = [];
	try {
		const entries = await readdir(PACK_OUT_ROOT, { withFileTypes: true });
		dirs = await Promise.all(
			entries
				.filter(d => d.isDirectory())
				.map(async d => {
					const s = await stat(join(PACK_OUT_ROOT, d.name));
					return { name: d.name, mtime: s.mtime.toISOString(), mtimeMs: s.mtimeMs };
				})
		);
		dirs.sort((a, b) => b.mtimeMs - a.mtimeMs);
	} catch {
		// No outputs yet
	}
	return dirs;
}

async function readManifest(dir: string): Promise<Record<string, unknown> | null> {
	try {
		const entries = await readdir(dir);
		const mf = entries.find(e => e.endsWith('_manifest.json'));
		if (!mf) return null;
		return JSON.parse(await readFile(join(dir, mf), 'utf-8'));
	} catch {
		return null;
	}
}

async function cleanupOldPacks(keep: number): Promise<number> {
	const dirs = await listPackDirs();
	let removed = 0;
	for (const d of dirs.slice(keep)) {
		await rm(join(PACK_OUT_ROOT, d.name), { recursive: true, force: true });
		removed += 1;
	}
	return removed;
}

export async function GET({ url }) {
	const action = url.searchParams.get('action') || 'outputs';

	try {
		if (action === 'roots') {
			return json({ repoRoot: REPO_ROOT, allowed: allowedRoots() });
		}

		if (action === 'stats' || action === 'tree') {
			const path = url.searchParams.get('path') || REPO_ROOT;
			assertAllowed(path);
			const include = splitList(url.searchParams.get('include'));
			const exclude = splitList(url.searchParams.get('exclude'));
			const model = url.searchParams.get('model') || undefined;
			const maxTokens = url.searchParams.get('maxTokens')
				? parseInt(url.searchParams.get('maxTokens')!, 10)
				: undefined;
			const maxFileSizeMB = url.searchParams.get('maxFileSizeMB')
				? parseFloat(url.searchParams.get('maxFileSizeMB')!)
				: undefined;

			const cfg = makeConfig(path, '', {
				model,
				maxTokens,
				include,
				exclude,
				maxFileSize: maxFileSizeMB ? maxFileSizeMB * 1024 * 1024 : undefined
			});

			if (action === 'tree') {
				const files = await discover(path, {
					respectGitignore: true,
					include: include.length ? include : undefined,
					exclude: exclude.length ? exclude : undefined
				});
				return json({ tree: generateTree(files), files: files.length });
			}
			const stats = await summarize(cfg);
			return json({ stats });
		}

		if (action === 'outputs') {
			const project = url.searchParams.get('project');
			if (project) {
				const dir = assertInsideOutDir(join(PACK_OUT_ROOT, project));
				const entries = await readdir(dir);
				const files = await Promise.all(
					entries.map(async name => {
						const s = await stat(join(dir, name));
						return { name, size: s.size, mtime: s.mtime.toISOString() };
					})
				);
				files.sort((a, b) => a.name.localeCompare(b.name));
				return json({ project, files });
			}

			const projects = await listPackDirs();
			const withMeta = await Promise.all(
				projects.map(async p => ({
					name: p.name,
					mtime: p.mtime,
					manifest: await readManifest(join(PACK_OUT_ROOT, p.name))
				}))
			);
			return json({ projects: withMeta, keepMax: PACK_KEEP_MAX });
		}

		if (action === 'content' || action === 'download') {
			const project = url.searchParams.get('project') || '';
			const file = url.searchParams.get('file') || '';
			const fullPath = assertInsideOutDir(join(PACK_OUT_ROOT, project, file));
			const content = await readFile(fullPath, 'utf-8');
			if (action === 'download') {
				const safeName = file.split('/').pop() || 'download';
				return new Response(content, {
					headers: {
						'Content-Type': contentTypeFor(file),
						'Content-Disposition': `attachment; filename="${safeName}"`
					}
				});
			}
			return json({ content, file, project });
		}

		return json({ error: 'Unknown action' }, { status: 400 });
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}

export async function POST({ request }) {
	try {
		const body = await request.json();
		const action = body.action || 'pack';

		if (action === 'pack') {
			const path = body.path || REPO_ROOT;
			assertAllowed(path);

			const format: PackFormat = body.format || 'markdown';
			const profile: PackProfile = body.profile || 'review';
			const model = body.model || undefined;
			const maxTokens = body.maxTokens ? parseInt(String(body.maxTokens), 10) : undefined;
			const include: string[] = Array.isArray(body.include) ? body.include : [];
			const exclude: string[] = Array.isArray(body.exclude) ? body.exclude : [];
			const maxFileSizeMB = body.maxFileSizeMB ? parseFloat(String(body.maxFileSizeMB)) : undefined;

			const slug = sanitizeSlug(path.split('/').pop() || 'project') || 'project';
			const outDir = join(PACK_OUT_ROOT, `${slug}-${Date.now()}`);

			const cfg = makeConfig(path, outDir, {
				format,
				profile,
				model,
				maxTokens,
				include,
				exclude,
				maxFileSize: maxFileSizeMB ? maxFileSizeMB * 1024 * 1024 : undefined
			});

			const summary = await packProject(cfg);
			const project = outDir.split('/').pop() || '';
			const removed = await cleanupOldPacks(PACK_KEEP_MAX);
			return json({ project, outDir, summary, removedOld: removed });
		}

		if (action === 'apply') {
			const projectRoot = body.root;
			if (!projectRoot) return json({ error: 'Missing root' }, { status: 400 });
			assertAllowed(projectRoot);
			const dryRun = body.dryRun !== false;
			const stats = await applyFindings(body.findings ?? [], projectRoot, dryRun);
			return json({ stats, dryRun });
		}

		if (action === 'delete') {
			const project = String(body.project || '');
			assertInsideOutDir(join(PACK_OUT_ROOT, project));
			await rm(join(PACK_OUT_ROOT, project), { recursive: true, force: true });
			return json({ deleted: project });
		}

		if (action === 'cleanup') {
			const keep = parseInt(String(body.keep ?? PACK_KEEP_MAX), 10) || PACK_KEEP_MAX;
			const removed = await cleanupOldPacks(Math.max(0, keep));
			return json({ removed, keep });
		}

		return json({ error: 'Unknown action' }, { status: 400 });
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}
