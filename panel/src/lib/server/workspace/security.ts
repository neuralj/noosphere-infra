import { resolve } from 'path';

const WORKSPACE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export function assertAllowedRepo(path: string, roots: string[]): string {
	const resolved = resolve(path);
	for (const root of roots) {
		const r = resolve(root);
		if (resolved === r || resolved.startsWith(r + '/')) return resolved;
	}
	throw new Error(`Path not allowed: ${path}`);
}

export function assertValidWorkspaceId(id: string): string {
	if (!WORKSPACE_ID_RE.test(id)) {
		throw new Error(`Invalid workspace id: ${id}`);
	}
	return id;
}
