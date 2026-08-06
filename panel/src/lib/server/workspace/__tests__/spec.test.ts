import { describe, expect, it } from 'vitest';
import { REPO_MOUNT_POINT } from '../compose';
import { readWorkspaceMeta } from '../spec';

const fullYaml = `services:
  main:
    image: ghcr.io/neuralj/devshell:latest
    labels:
      org.openlaputa.workspace.id: demo
      org.openlaputa.workspace.createdAt: '1700000000000'
    volumes:
      - /Users/travis/repos/openlaputa:/workspace/repo
    environment:
      REPO_ROOT: /workspace/repo
    ports:
      - '22:'
      - '8080:'
  postgres:
    image: ghcr.io/neuralj/postgres:latest
    labels:
      org.openlaputa.workspace.role: sidecar
    environment:
      POSTGRES_PASSWORD: laputa
    ports:
      - '5432:'
  qdrant:
    image: ghcr.io/neuralj/qdrant:latest
    labels:
      org.openlaputa.workspace.role: sidecar
    ports:
      - '6333:'
`;

describe('readWorkspaceMeta', () => {
	it('extracts spec and createdAt from a generated compose file', () => {
		const meta = readWorkspaceMeta(fullYaml, 'demo');
		expect(meta.createdAt).toBe(1700000000000);
		expect(meta.spec).toEqual({
			id: 'demo',
			image: 'ghcr.io/neuralj/devshell:latest',
			repoPath: '/Users/travis/repos/openlaputa',
			services: ['postgres', 'qdrant'],
			env: { REPO_ROOT: '/workspace/repo' }
		});
	});

	it('returns null repoPath when no repo volume is mounted', () => {
		const meta = readWorkspaceMeta('services:\n  main:\n    image: ghcr.io/neuralj/shell:latest\n', 'a');
		expect(meta.spec.repoPath).toBeNull();
	});

	it('filters unknown sidecar services', () => {
		const yaml = `services:\n  main:\n    image: ghcr.io/neuralj/shell:latest\n  redis:\n    image: redis:7\n`;
		expect(readWorkspaceMeta(yaml, 'a').spec.services).toEqual([]);
	});

	it('tolerates empty or malformed documents', () => {
		expect(readWorkspaceMeta('', 'x').spec.image).toBe('');
		expect(readWorkspaceMeta('not: [valid', 'x').spec.image).toBe('');
		expect(readWorkspaceMeta('services: null', 'x').spec.services).toEqual([]);
	});
});

describe('REPO_MOUNT_POINT contract', () => {
	it('mounts repos at /workspace/repo', () => {
		expect(REPO_MOUNT_POINT).toBe('/workspace/repo');
	});
});
