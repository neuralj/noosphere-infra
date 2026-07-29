import { json } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { findRepoRoot } from '$lib/server/repo';

const REPO_ROOT = findRepoRoot();

interface ProxyRoute {
	address: string;
	handles: { match: string; upstream: string }[];
}

function parseSiteBlocks(content: string): { address: string; body: string }[] {
	const lines = content.split('\n');
	const blocks: { address: string; body: string }[] = [];
	let currentAddress = '';
	let currentBody = '';
	let braceCount = 0;

	for (const line of lines) {
		const trimmed = line.trim();
		if (braceCount === 0) {
			if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('(')) {
				currentAddress = trimmed;
			}
		}
		if (trimmed.includes('{')) {
			braceCount++;
			if (braceCount === 1) {
				currentAddress = currentAddress.replace(/\s*\{.*$/, '').trim();
				continue;
			}
		}
		if (trimmed.includes('}')) {
			braceCount--;
			if (braceCount === 0) {
				blocks.push({ address: currentAddress, body: currentBody });
				currentAddress = '';
				currentBody = '';
				continue;
			}
		}
		if (braceCount > 0) {
			currentBody += trimmed + '\n';
		}
	}

	return blocks;
}

export async function GET() {
	try {
		const sitesDir = join(REPO_ROOT, 'caddy', 'sites');
		const files = await readdir(sitesDir);
		const result: { file: string; routes: ProxyRoute[] }[] = [];

		for (const file of files) {
			const content = await readFile(join(sitesDir, file), 'utf-8');
			const blocks = parseSiteBlocks(content);
			const routes: ProxyRoute[] = [];

			for (const block of blocks) {
				if (!block.address) continue;

				const handles: { match: string; upstream: string }[] = [];

				const handleMatches = [...block.body.matchAll(/handle\s+(\S+)\s*\{([^}]*)\}/g)];
				for (const h of handleMatches) {
					const match = h[1];
					const upstreamMatch = h[2].match(/reverse_proxy\s+([^\s]+)/);
					if (upstreamMatch) {
						handles.push({ match, upstream: upstreamMatch[1] });
					}
				}

				if (handleMatches.length === 0) {
					const directProxy = block.body.match(/reverse_proxy\s+([^\s]+)/);
					if (directProxy) {
						handles.push({ match: '/', upstream: directProxy[1] });
					}
				}

				routes.push({ address: block.address, handles });
			}

			result.push({ file, routes });
		}

		return json({ siteFiles: result });
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}
