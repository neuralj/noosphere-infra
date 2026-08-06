import { readdir } from 'fs/promises';
import { join } from 'path';
import { composeFilePath, inspectWorkspace, WORKSPACES_ROOT } from './lifecycle';
import type { Workspace } from './types';

const ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export async function listWorkspaceIds(): Promise<string[]> {
	let ids: string[] = [];
	try {
		const entries = await readdir(WORKSPACES_ROOT, { withFileTypes: true });
		for (const e of entries) {
			if (!e.isDirectory() || !ID_RE.test(e.name)) continue;
			try {
				const files = await readdir(join(WORKSPACES_ROOT, e.name));
				if (files.includes('compose.yml')) ids.push(e.name);
			} catch {
				/* unreadable dir: skip */
			}
		}
	} catch {
		/* no workspaces yet */
	}
	return ids;
}

function degenerate(id: string): Workspace {
	return {
		id,
		image: '',
		repoPath: null,
		services: [],
		env: {},
		state: 'error',
		containerIds: {},
		ports: {},
		composeFile: composeFilePath(id),
		createdAt: 0,
		startedAt: null
	};
}

export async function reconcileWorkspaces(): Promise<Workspace[]> {
	const ids = await listWorkspaceIds();
	const all: Workspace[] = [];
	for (const id of ids) {
		try {
			all.push(await inspectWorkspace(id));
		} catch {
			all.push(degenerate(id));
		}
	}
	all.sort((a, b) => b.createdAt - a.createdAt);
	return all;
}
