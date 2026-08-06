import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { findRepoRoot } from '$lib/server/repo';
import { COMPOSE_PROJECT_PREFIX, generateCompose } from './compose';
import { deriveStateFromPs, runCompose, psEntries } from './docker';
import { assertAllowedRepo, assertValidWorkspaceId } from './security';
import { readWorkspaceMeta } from './spec';
import type { Workspace, WorkspaceSpec } from './types';
import { readAllPorts } from './ports';

export const WORKSPACES_ROOT = join(findRepoRoot(), 'run', 'workspaces');

export function workspaceDir(id: string): string {
	assertValidWorkspaceId(id);
	return join(WORKSPACES_ROOT, id);
}

export function composeFilePath(id: string): string {
	return join(workspaceDir(id), 'compose.yml');
}

export function projectName(id: string): string {
	return COMPOSE_PROJECT_PREFIX + id;
}

async function inspectRaw(id: string, spec: WorkspaceSpec, createdAt: number): Promise<Workspace> {
	const cf = composeFilePath(id);
	const project = projectName(id);
	const entries = await psEntries(project, cf);
	const state = deriveStateFromPs(entries);
	const containerIds: Record<string, string> = {};
	for (const e of entries) {
		if (e.Service) containerIds[e.Service] = e.Name ?? '';
	}
	const ports = state === 'running' ? await readAllPorts(project, cf, spec) : {};
	const main = entries.find(e => e.Service === 'main');
	const startedAt = main?.StartedAt ? Date.parse(main.StartedAt) || null : null;
	return {
		...spec,
		id,
		state,
		containerIds,
		ports,
		composeFile: cf,
		createdAt,
		startedAt
	};
}

export async function createWorkspace(spec: WorkspaceSpec, roots: string[]): Promise<Workspace> {
	const id = assertValidWorkspaceId(spec.id);
	if (spec.repoPath) assertAllowedRepo(spec.repoPath, roots);
	const dir = workspaceDir(id);
	await mkdir(dir, { recursive: true });
	const ts = Date.now();
	const cf = composeFilePath(id);
	try {
		await writeFile(cf, generateCompose(spec, ts));
		await runCompose(['-f', cf, 'config', '--quiet']);
	} catch (e) {
		await rm(dir, { recursive: true, force: true });
		throw e;
	}
	return {
		...spec,
		id,
		state: 'created',
		containerIds: {},
		ports: {},
		composeFile: cf,
		createdAt: ts,
		startedAt: null
	};
}

export async function inspectWorkspace(id: string): Promise<Workspace> {
	assertValidWorkspaceId(id);
	const cf = composeFilePath(id);
	const yaml = await readFile(cf, 'utf-8');
	const meta = readWorkspaceMeta(yaml, id);
	return inspectRaw(id, meta.spec, meta.createdAt);
}

export async function startWorkspace(id: string): Promise<Workspace> {
	assertValidWorkspaceId(id);
	await runCompose(['-p', projectName(id), '-f', composeFilePath(id), 'up', '-d', '--remove-orphans'], 300_000);
	return inspectWorkspace(id);
}

export async function stopWorkspace(id: string): Promise<Workspace> {
	assertValidWorkspaceId(id);
	await runCompose(['-p', projectName(id), '-f', composeFilePath(id), 'stop']);
	return inspectWorkspace(id);
}

export async function restartWorkspace(id: string): Promise<Workspace> {
	assertValidWorkspaceId(id);
	await runCompose(['-p', projectName(id), '-f', composeFilePath(id), 'restart']);
	return inspectWorkspace(id);
}

export async function destroyWorkspace(id: string): Promise<void> {
	assertValidWorkspaceId(id);
	const cf = composeFilePath(id);
	try {
		await runCompose(['-p', projectName(id), '-f', cf, 'down', '-v', '--remove-orphans'], 60_000);
	} catch {
		/* best-effort teardown */
	}
	await rm(workspaceDir(id), { recursive: true, force: true });
}

export async function workspaceLogs(id: string, tail = 200): Promise<string> {
	assertValidWorkspaceId(id);
	try {
		return await runCompose(['-p', projectName(id), '-f', composeFilePath(id), 'logs', '--tail', String(tail)]);
	} catch {
		return '';
	}
}
