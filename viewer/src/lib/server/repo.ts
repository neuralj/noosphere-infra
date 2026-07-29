import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

export function findRepoRoot(): string {
	let dir = dirname(fileURLToPath(import.meta.url));
	while (dir !== '/') {
		if (existsSync(join(dir, 'Caddyfile')) && existsSync(join(dir, 'caddy'))) {
			return dir;
		}
		dir = dirname(dir);
	}
	return process.cwd();
}
