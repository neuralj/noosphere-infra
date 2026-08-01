import { json } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { findRepoRoot } from '$lib/server/repo';

const REPO_ROOT = findRepoRoot();
const execFileAsync = promisify(execFile);

interface CaddySite {
	name: string;
	domains: string[];
	backends: string[];
}

function parseSiteFile(content: string): { domains: string[]; backends: string[] } {
	const domains: string[] = [];
	const backends: string[] = [];

	const domainLine = content.match(/^([^{]+)\{/m);
	if (domainLine) {
		const raw = domainLine[1].trim();
		raw.split(',').forEach((d) => {
			const trimmed = d.trim();
			if (trimmed) domains.push(trimmed);
		});
	}

	const proxyMatches = content.matchAll(/reverse_proxy\s+(\S+)/g);
	for (const m of proxyMatches) {
		if (!backends.includes(m[1])) {
			backends.push(m[1]);
		}
	}

	return { domains, backends };
}

export async function GET() {
	try {
		const sitesDir = join(REPO_ROOT, 'caddy', 'sites');
		const files = await readdir(sitesDir);
		const siteFiles = files.filter((f: string) => f !== '.gitkeep');

		const sites: CaddySite[] = [];

		for (const file of siteFiles) {
			const content = await readFile(join(sitesDir, file), 'utf-8');
			const { domains, backends } = parseSiteFile(content);
			sites.push({
				name: file,
				domains,
				backends
			});
		}

		return json({ sites });
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}

export async function POST({ url }: { url: URL }) {
	const action = url.searchParams.get('action');

	if (action === 'reload') {
		try {
			const { stdout, stderr } = await execFileAsync('/opt/homebrew/bin/caddy', [
				'reload',
				'--config',
				join(REPO_ROOT, 'caddy', 'Caddyfile')
			]);
			return json({ success: true, stdout, stderr });
		} catch (e: unknown) {
			const err = e as { stderr?: string; message?: string };
			return json({ error: err.stderr || err.message || String(e) }, { status: 500 });
		}
	}

	return json({ error: 'Unknown action' }, { status: 400 });
}
