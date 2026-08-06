import { open, readdir } from 'fs/promises';
import { join } from 'path';
import ignore from 'ignore';
import type { Ignore } from 'ignore';
import { isIgnored, loadGitExclude, loadNestedGitignore, loadRootGitignore, type SpecEntry } from './ignore';

export const HARDCODED_IGNORE_DIRS = new Set([
	'.git',
	'.hg',
	'.svn',
	'__pycache__',
	'.mypy_cache',
	'.pytest_cache',
	'.ruff_cache',
	'.tox',
	'.nox',
	'.venv',
	'venv',
	'env',
	'.egg-info',
	'site-packages',
	'.idea',
	'.vscode',
	'.next',
	'.gradle',
	'node_modules',
	'target',
	'dist',
	'build'
]);

export const BINARY_SUFFIXES = new Set([
	'.pyc', '.pyo', '.pyd', '.so', '.o', '.a', '.dylib', '.dll', '.exe',
	'.bin', '.obj', '.lib', '.class', '.jar', '.wasm',
	'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.ico', '.webp', '.avif',
	'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
	'.zip', '.tar', '.gz', '.tgz', '.rar', '.7z', '.bz2', '.xz',
	'.whl', '.egg', '.deb', '.rpm', '.apk', '.ipa',
	'.db', '.sqlite', '.sqlite3', '.dat',
	'.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav', '.flac', '.ogg',
	'.woff', '.woff2', '.ttf', '.otf', '.eot',
	'.parquet', '.pkl', '.pickle', '.model', '.pt', '.pth', '.onnx', '.h5',
	'.npz', '.feather', '.arrow'
]);

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

async function isTextFile(filePath: string): Promise<boolean> {
	try {
		const fh = await open(filePath, 'r');
		const buf = Buffer.alloc(8192);
		const { bytesRead } = await fh.read(buf, 0, 8192, 0);
		await fh.close();
		const data = buf.subarray(0, bytesRead);
		if (data.length === 0) return true;
		if (data.includes(0)) return false;
		try {
			utf8Decoder.decode(data);
			return true;
		} catch {
			return false;
		}
	} catch {
		return false;
	}
}

function buildGlobSpec(patterns: string[]): Ignore | null {
	if (patterns.length === 0) return null;
	return ignore().add(patterns);
}

export interface DiscoverOptions {
	respectGitignore?: boolean;
	include?: string[];
	exclude?: string[];
	extraExclude?: string[];
}

export async function discover(
	root: string,
	opts: DiscoverOptions = {}
): Promise<string[]> {
	const respectGitignore = opts.respectGitignore ?? true;
	const gitExclude = respectGitignore ? await loadGitExclude(root) : null;
	const rootSpec = respectGitignore ? await loadRootGitignore(root) : null;
	const chain: SpecEntry[] = rootSpec ? [{ depth: 0, spec: rootSpec }] : [];

	const includeSpec = buildGlobSpec(opts.include ?? []);
	const excludeSpec = buildGlobSpec([...(opts.exclude ?? []), ...(opts.extraExclude ?? [])]);

	const results: string[] = [];

	async function recurse(dirAbs: string, relParts: string[], chain: SpecEntry[]): Promise<void> {
		let newChain = chain;
		if (respectGitignore) {
			const nested = await loadNestedGitignore(dirAbs);
			if (nested !== null) {
				newChain = [...chain, { depth: relParts.length, spec: nested }];
			}
		}

		let entries: { name: string; isDir: boolean }[];
		try {
			const dirents = await readdir(dirAbs, { withFileTypes: true });
			entries = dirents
				.filter(d => !d.name.startsWith('.'))
				.map(d => ({ name: d.name, isDir: d.isDirectory() }))
				.sort((a, b) => a.name.localeCompare(b.name));
		} catch {
			return;
		}

		for (const entry of entries) {
			const rel = [...relParts, entry.name].join('/');
			if (entry.isDir) {
				if (HARDCODED_IGNORE_DIRS.has(entry.name)) continue;
				if (respectGitignore && isIgnored([...relParts, entry.name], newChain, gitExclude)) continue;
				await recurse(join(dirAbs, entry.name), [...relParts, entry.name], newChain);
			} else {
				if (respectGitignore && isIgnored([...relParts, entry.name], newChain, gitExclude)) continue;
				const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
				if (BINARY_SUFFIXES.has(ext)) continue;
				const abs = join(dirAbs, entry.name);
				if (!(await isTextFile(abs))) continue;
				if (includeSpec !== null && !includeSpec.ignores(rel)) continue;
				if (excludeSpec !== null && excludeSpec.ignores(rel)) continue;
				results.push(rel);
			}
		}
	}

	await recurse(root, [], chain);
	results.sort();
	return results;
}
