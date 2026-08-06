import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { makeConfig } from '../profiles';
import { packProject, summarize } from '../packer';

async function fixtureProject(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), 'code2llm-pack-'));
	await mkdir(join(dir, 'src'), { recursive: true });
	await writeFile(join(dir, 'src', 'main.py'), 'import os\n\ndef main():\n    return "hello"\n');
	await writeFile(join(dir, 'src', 'lib.go'), 'package main\n\nfunc main() {}\n');
	await writeFile(join(dir, 'big.txt'), 'x'.repeat(50_000));
	return dir;
}

describe('summarize', () => {
	it('reports files and tokens', async () => {
		const dir = await fixtureProject();
		try {
			const cfg = makeConfig(dir, join(dir, 'out'));
			const stats = await summarize(cfg);
			expect(stats.files).toBe(3);
			expect(stats.totalTokens).toBeGreaterThan(0);
			expect(stats.estimatedSegments).toBeGreaterThanOrEqual(1);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('skips oversized files when configured', async () => {
		const dir = await fixtureProject();
		try {
			const cfg = makeConfig(dir, join(dir, 'out'), { maxFileSize: 1024 });
			const stats = await summarize(cfg);
			expect(stats.files).toBe(3);
			expect(stats.skippedLarge).toEqual(['big.txt']);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});

describe('packProject', () => {
	it('writes markdown segments and a manifest', async () => {
		const dir = await fixtureProject();
		try {
			const cfg = makeConfig(dir, join(dir, 'out'), { format: 'markdown' });
			const summary = await packProject(cfg);
			expect(summary.files).toBe(3);
			expect(summary.outputs.length).toBeGreaterThanOrEqual(1);
			const name = summary.outputs[0];
			expect(name).toMatch(/^code2llm-pack.*_part_\d+\.md$/);
			const manifestName = summary.outputs.find(o => o.endsWith('_manifest.json'));
			expect(manifestName).toBeTruthy();
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('splits oversized files into bounded chunks with line markers', async () => {
		const dir = await fixtureProject();
		try {
			const cfg = makeConfig(dir, join(dir, 'out'), {
				format: 'markdown',
				maxTokens: 2000
			});
			const summary = await packProject(cfg);
			const parts = summary.outputs.filter(o => o.endsWith('.md'));
			expect(parts.length).toBeGreaterThan(1);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('writes jsonl with per-file records', async () => {
		const dir = await fixtureProject();
		try {
			const cfg = makeConfig(dir, join(dir, 'out'), { format: 'jsonl' });
			const summary = await packProject(cfg);
			expect(summary.format).toBe('jsonl');
			expect(summary.outputs.some(o => o.endsWith('.jsonl'))).toBe(true);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
