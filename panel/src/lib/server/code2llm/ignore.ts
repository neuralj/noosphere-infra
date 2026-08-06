import { readFile } from 'fs/promises';
import { join } from 'path';
import ignore from 'ignore';
import type { Ignore } from 'ignore';

export interface SpecEntry {
	depth: number;
	spec: Ignore;
}

async function loadSpec(filePath: string): Promise<Ignore | null> {
	try {
		const content = await readFile(filePath, 'utf-8');
		return ignore().add(content);
	} catch {
		return null;
	}
}

export async function loadGitExclude(root: string): Promise<Ignore | null> {
	return loadSpec(join(root, '.git', 'info', 'exclude'));
}

export async function loadRootGitignore(root: string): Promise<Ignore | null> {
	return loadSpec(join(root, '.gitignore'));
}

export async function loadNestedGitignore(dirPath: string): Promise<Ignore | null> {
	return loadSpec(join(dirPath, '.gitignore'));
}

export function isIgnored(relParts: string[], chain: SpecEntry[], gitExclude: Ignore | null): boolean {
	const n = relParts.length;
	for (const { depth, spec } of chain) {
		if (depth >= n) continue;
		const rel = relParts.slice(depth).join('/');
		if (spec.ignores(rel) || spec.ignores(rel + '/')) return true;
	}
	if (gitExclude && gitExclude.ignores(relParts.join('/'))) return true;
	return false;
}
