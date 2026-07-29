import { json } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../../../');

export async function GET() {
	try {
		const composeDir = join(REPO_ROOT, 'compose');
		const files = await readdir(composeDir);
		const composeFiles = files.filter((f: string) => f.endsWith('.yml') || f.endsWith('.yaml'));
		const result = [];

		for (const file of composeFiles) {
			const content = await readFile(join(composeDir, file), 'utf-8');
			const parsed = yaml.load(content) as Record<string, unknown>;
			const services = (parsed.services || {}) as Record<string, Record<string, unknown>>;
			const serviceList = Object.entries(services).map(([name, config]) => ({
				name,
				image: config.image || '',
				ports: (config.ports || []) as string[],
				volumes: (config.volumes || []) as string[],
				network_mode: config.network_mode || '',
				profiles: (config.profiles || []) as string[],
				depends_on: config.depends_on || [],
				environment: config.environment || {}
			}));
			result.push({ file, services: serviceList });
		}

		return json({ composeFiles: result });
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}
