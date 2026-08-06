import { load as loadYaml } from 'js-yaml';
import { REPO_MOUNT_POINT } from './compose';
import { isKnownSidecar } from './catalog';
import { LABEL } from './labels';
import type { SidecarName, WorkspaceSpec } from './types';

export interface WorkspaceMeta {
	spec: WorkspaceSpec;
	createdAt: number;
}

export function readWorkspaceMeta(yamlText: string, id: string): WorkspaceMeta {
	let doc: Record<string, any> = {};
	try {
		const parsed = loadYaml(yamlText);
		if (parsed && typeof parsed === 'object') doc = parsed as Record<string, any>;
	} catch {
		/* malformed file: return empty spec */
	}
	const services = (doc.services ?? {}) as Record<string, any>;
	const main = services.main ?? {};
	const volumes: unknown[] = Array.isArray(main.volumes) ? main.volumes : [];
	const repoVol = volumes.find(
		v => typeof v === 'string' && v.endsWith(':' + REPO_MOUNT_POINT)
	) as string | undefined;
	const repoPath = repoVol ? repoVol.slice(0, -REPO_MOUNT_POINT.length - 1) : null;
	const sidecars = Object.keys(services)
		.filter(s => s !== 'main' && isKnownSidecar(s))
		.map(s => s as SidecarName);
	const env = (main.environment ?? {}) as Record<string, string>;
	const createdAt = Number((main.labels ?? {})[LABEL.createdAt]) || 0;
	return {
		spec: {
			id,
			image: String(main.image ?? ''),
			repoPath,
			services: sidecars,
			env
		},
		createdAt
	};
}
