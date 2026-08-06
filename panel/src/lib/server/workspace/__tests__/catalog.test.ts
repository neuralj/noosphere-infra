import { describe, expect, it } from 'vitest';
import { MAIN_IMAGES, SIDECAR_SERVICES, isKnownMainImage, isKnownSidecar } from '../catalog';

describe('SIDECAR_SERVICES', () => {
	it('uses neuralj images for all sidecars', () => {
		for (const def of Object.values(SIDECAR_SERVICES)) {
			expect(def.image).toMatch(/^ghcr\.io\/neuralj\//);
		}
	});

	it('defines postgres, qdrant and ollama', () => {
		expect(Object.keys(SIDECAR_SERVICES).sort()).toEqual(['ollama', 'postgres', 'qdrant']);
	});

	it('exposes expected internal ports', () => {
		expect(SIDECAR_SERVICES.postgres.ports).toEqual([5432]);
		expect(SIDECAR_SERVICES.qdrant.ports).toEqual([6333]);
		expect(SIDECAR_SERVICES.ollama.ports).toEqual([11434]);
	});

	it('sets postgres password and ollama volume', () => {
		expect(SIDECAR_SERVICES.postgres.env).toEqual({ POSTGRES_PASSWORD: 'laputa' });
		expect(SIDECAR_SERVICES.ollama.volumes).toEqual(['ollama:/root/.ollama']);
	});
});

describe('MAIN_IMAGES', () => {
	it('devshell exposes ssh, code-server and jupyter ports', () => {
		expect(MAIN_IMAGES['ghcr.io/neuralj/devshell:latest'].ports).toEqual([22, 8080, 8888]);
	});

	it('shell exposes ssh only', () => {
		expect(MAIN_IMAGES['ghcr.io/neuralj/shell:latest'].ports).toEqual([22]);
	});
});

describe('isKnown*', () => {
	it('accepts known names and rejects unknown', () => {
		expect(isKnownSidecar('postgres')).toBe(true);
		expect(isKnownSidecar('redis')).toBe(false);
		expect(isKnownMainImage('ghcr.io/neuralj/devshell:latest')).toBe(true);
		expect(isKnownMainImage('nginx:latest')).toBe(false);
	});
});
