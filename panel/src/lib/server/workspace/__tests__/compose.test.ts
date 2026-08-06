import { describe, expect, it } from 'vitest';
import { load as loadYaml } from 'js-yaml';
import { generateCompose, REPO_MOUNT_POINT } from '../compose';
import { LABEL } from '../labels';
import type { WorkspaceSpec } from '../types';

const TS = 1700000000000;

const base: WorkspaceSpec = {
	id: 'demo',
	image: 'ghcr.io/neuralj/devshell:latest',
	repoPath: '/repos/openlaputa',
	services: ['postgres'],
	env: { FOO: 'bar' }
};

function doc(spec: WorkspaceSpec): Record<string, any> {
	return loadYaml(generateCompose(spec, TS)) as Record<string, any>;
}

describe('generateCompose', () => {
	it('builds the main service with image, labels, env and ports', () => {
		const main = doc(base).services.main;
		expect(main.image).toBe('ghcr.io/neuralj/devshell:latest');
		expect(main.labels[LABEL.id]).toBe('demo');
		expect(main.labels[LABEL.role]).toBe('main');
		expect(main.labels[LABEL.createdAt]).toBe(String(TS));
		expect(main.environment).toEqual({ FOO: 'bar' });
		expect(main.ports).toEqual([{ target: 22 }, { target: 8080 }, { target: 8888 }]);
	});

	it('mounts the repo read-write at the fixed mount point', () => {
		const main = doc(base).services.main;
		expect(main.volumes).toEqual(['/repos/openlaputa:/workspace/repo']);
		expect(REPO_MOUNT_POINT).toBe('/workspace/repo');
	});

	it('omits repo volume when repoPath is null', () => {
		const main = doc({ ...base, repoPath: null }).services.main;
		expect(main.volumes).toBeUndefined();
	});

	it('omits env and ports when empty', () => {
		const main = doc({ ...base, repoPath: null, env: {} }).services.main;
		expect(main.environment).toBeUndefined();
	});

	it('adds sidecars from spec.services with neuralj image and sidecar role', () => {
		const out = doc({ ...base, services: ['postgres', 'qdrant', 'ollama'] });
		expect(out.services.postgres.image).toBe('ghcr.io/neuralj/postgres:latest');
		expect(out.services.postgres.labels[LABEL.role]).toBe('sidecar');
		expect(out.services.postgres.environment).toEqual({ POSTGRES_PASSWORD: 'laputa' });
		expect(out.services.postgres.ports).toEqual([{ target: 5432 }]);
		expect(out.services.qdrant.image).toBe('ghcr.io/neuralj/qdrant:latest');
		expect(out.services.ollama.image).toBe('ghcr.io/neuralj/ollama:latest');
		expect(out.services.ollama.volumes).toEqual(['ollama:/root/.ollama']);
	});

	it('does not add services not requested', () => {
		const out = doc(base);
		expect(out.services.qdrant).toBeUndefined();
		expect(out.services.ollama).toBeUndefined();
	});

	it('rejects unknown sidecar names', () => {
		expect(() =>
			generateCompose({ ...base, services: ['redis'] as unknown as WorkspaceSpec['services'] }, TS)
		).toThrow(/Unknown sidecar/);
	});

	it('rejects unknown main images', () => {
		expect(() => generateCompose({ ...base, image: 'nginx:latest' }, TS)).toThrow(/Unknown main image/);
	});

	it('generates YAML without a top-level name (project comes from -p flag)', () => {
		const text = generateCompose(base, TS);
		const parsed = loadYaml(text) as Record<string, any>;
		expect(parsed.name).toBeUndefined();
		expect(Object.keys(parsed.services).sort()).toEqual(['main', 'postgres']);
	});
});
