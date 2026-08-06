import { MAIN_IMAGES, SIDECAR_SERVICES } from './catalog';
import { runCompose } from './docker';
import type { WorkspaceSpec } from './types';

export function parsePortOutput(line: string): number | null {
	const m = line.trim().match(/:(\d{1,5})$/);
	return m ? parseInt(m[1], 10) : null;
}

export async function readAllPorts(
	project: string,
	composeFile: string,
	spec: WorkspaceSpec
): Promise<Record<string, number>> {
	const combos: { service: string; port: number }[] = [];
	for (const p of MAIN_IMAGES[spec.image]?.ports ?? []) combos.push({ service: 'main', port: p });
	for (const s of spec.services) {
		for (const p of SIDECAR_SERVICES[s]?.ports ?? []) combos.push({ service: s, port: p });
	}
	const out: Record<string, number> = {};
	for (const c of combos) {
		try {
			const stdout = await runCompose([
				'-p',
				project,
				'-f',
				composeFile,
				'port',
				c.service,
				String(c.port)
			]);
			const hostPort = parsePortOutput(stdout);
			if (hostPort != null) out[`${c.service}:${c.port}`] = hostPort;
		} catch {
			/* container not running or port unpublished: skip */
		}
	}
	return out;
}
