import { json } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../../../');

interface NginxRoute {
	serverName: string;
	listen: string;
	locations: { path: string; proxyPass: string }[];
}

export async function GET() {
	try {
		const confDir = join(REPO_ROOT, 'nginx', 'conf.d');
		const files = await readdir(confDir);
		const confFiles = files.filter((f: string) => f.endsWith('.conf'));
		const result: { file: string; routes: NginxRoute[] }[] = [];

		for (const file of confFiles) {
			const content = await readFile(join(confDir, file), 'utf-8');
			const routes: NginxRoute[] = [];
			const serverBlocks = content.match(/server\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g) || [];

			for (const block of serverBlocks) {
				const serverNameMatch = block.match(/server_name\s+([^;]+);/);
				const listenMatch = block.match(/listen\s+([^;]+);/);
				const serverName = serverNameMatch ? serverNameMatch[1].trim() : '';
				const listen = listenMatch ? listenMatch[1].trim() : '';
				const locationBlocks: { path: string; proxyPass: string }[] = [];
				const locationMatches = [...block.matchAll(/location\s+(\S+)\s*\{[^}]*proxy_pass\s+([^;]+);/g)];
				for (const m of locationMatches) {
					locationBlocks.push({ path: m[1], proxyPass: m[2].trim() });
				}
				if (serverName) {
					routes.push({ serverName, listen, locations: locationBlocks });
				}
			}

			result.push({ file, routes });
		}

		return json({ confFiles: result });
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}
