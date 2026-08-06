import { dump as dumpYaml } from 'js-yaml';
import { MAIN_IMAGES, SIDECAR_SERVICES, isKnownMainImage, isKnownSidecar } from './catalog';
import { sidecarLabels, toLabels } from './labels';
import type { SidecarName, WorkspaceSpec } from './types';

export const COMPOSE_PROJECT_PREFIX = 'openlaputa-';
export const REPO_MOUNT_POINT = '/workspace/repo';

interface ComposeService {
	image: string;
	labels: Record<string, string>;
	volumes?: string[];
	environment?: Record<string, string>;
	ports?: { target: number }[];
}

interface ComposeDoc {
	services: Record<string, ComposeService>;
}

function buildMain(spec: WorkspaceSpec, ts: number): ComposeService {
	const svc: ComposeService = {
		image: spec.image,
		labels: toLabels(spec.id, ts)
	};
	const volumes: string[] = [];
	if (spec.repoPath) {
		volumes.push(`${spec.repoPath}:${REPO_MOUNT_POINT}`);
	}
	if (volumes.length) svc.volumes = volumes;
	if (Object.keys(spec.env).length) svc.environment = spec.env;
	const ports = MAIN_IMAGES[spec.image].ports.map(p => ({ target: p }));
	if (ports.length) svc.ports = ports;
	return svc;
}

function buildSidecar(name: SidecarName): ComposeService {
	const def = SIDECAR_SERVICES[name];
	const svc: ComposeService = {
		image: def.image,
		labels: sidecarLabels()
	};
	if (Object.keys(def.env).length) svc.environment = def.env;
	if (def.volumes.length) svc.volumes = def.volumes;
	if (def.ports.length) svc.ports = def.ports.map(p => ({ target: p }));
	return svc;
}

export function generateCompose(spec: WorkspaceSpec, ts: number): string {
	if (!isKnownMainImage(spec.image)) {
		throw new Error(`Unknown main image: ${spec.image}`);
	}
	for (const s of spec.services) {
		if (!isKnownSidecar(s)) {
			throw new Error(`Unknown sidecar service: ${s}`);
		}
	}
	const services: Record<string, ComposeService> = {
		main: buildMain(spec, ts)
	};
	for (const name of spec.services) {
		services[name] = buildSidecar(name);
	}
	const doc: ComposeDoc = { services };
	return dumpYaml(doc);
}
