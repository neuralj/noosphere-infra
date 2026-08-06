import { describe, expect, it } from 'vitest';
import ignore from 'ignore';
import { isIgnored, type SpecEntry } from '../ignore';
import { HARDCODED_IGNORE_DIRS, discover } from '../discovery';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('isIgnored', () => {
	it('matches root spec against relative paths', () => {
		const spec = ignore().add(['node_modules/', '*.log']);
		const chain: SpecEntry[] = [{ depth: 0, spec }];
		expect(isIgnored(['node_modules', 'x.js'], chain, null)).toBe(true);
		expect(isIgnored(['a.log'], chain, null)).toBe(true);
		expect(isIgnored(['src', 'main.ts'], chain, null)).toBe(false);
	});

	it('honours negation within one spec', () => {
		const spec = ignore().add(['*.log', '!keep.log']);
		const chain: SpecEntry[] = [{ depth: 0, spec }];
		expect(isIgnored(['drop.log'], chain, null)).toBe(true);
		expect(isIgnored(['keep.log'], chain, null)).toBe(false);
	});

	it('respects nested spec depth', () => {
		const rootSpec = ignore().add(['skip/']);
		const nestedSpec = ignore().add(['inner/']);
		const chain: SpecEntry[] = [
			{ depth: 0, spec: rootSpec },
			{ depth: 1, spec: nestedSpec }
		];
		expect(isIgnored(['skip', 'a.ts'], chain, null)).toBe(true);
		expect(isIgnored(['src', 'inner', 'b.ts'], chain, null)).toBe(true);
		expect(isIgnored(['src', 'a.ts'], chain, null)).toBe(false);
	});

	it('consults git exclude last', () => {
		const gitExclude = ignore().add(['secret.txt']);
		expect(isIgnored(['secret.txt'], [], gitExclude)).toBe(true);
	});
});

describe('HARDCODED_IGNORE_DIRS', () => {
	it('covers vcs, caches and deps', () => {
		for (const d of ['.git', 'node_modules', '__pycache__', 'target', 'dist', 'build', '.venv']) {
			expect(HARDCODED_IGNORE_DIRS.has(d)).toBe(true);
		}
	});
});

describe('discover', () => {
	async function fixture() {
		const dir = await mkdtemp(join(tmpdir(), 'code2llm-test-'));
		await mkdir(join(dir, 'src'), { recursive: true });
		await mkdir(join(dir, 'node_modules'), { recursive: true });
		await mkdir(join(dir, 'nested'), { recursive: true });
		await writeFile(join(dir, '.gitignore'), 'ignored.log\n');
		await writeFile(join(dir, 'src', 'main.ts'), 'export const x = 1;\n');
		await writeFile(join(dir, 'src', 'ignored.log'), 'nope\n');
		await writeFile(join(dir, 'node_modules', 'dep.js'), 'junk\n');
		await writeFile(join(dir, 'nested', '.gitignore'), 'inner.txt\n');
		await writeFile(join(dir, 'nested', 'keep.ts'), 'ok\n');
		await writeFile(join(dir, 'nested', 'inner.txt'), 'skip\n');
		await writeFile(join(dir, 'data.bin'), Buffer.from([0, 1, 2, 3, 255]));
		return dir;
	}

	it('applies gitignore, hardcoded dirs and binary sniffing', async () => {
		const dir = await fixture();
		try {
			const files = await discover(dir);
			expect(files).toContain('src/main.ts');
			expect(files).toContain('nested/keep.ts');
			expect(files).not.toContain('src/ignored.log');
			expect(files).not.toContain('nested/inner.txt');
			expect(files).not.toContain('node_modules/dep.js');
			expect(files).not.toContain('data.bin');
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('supports include globs', async () => {
		const dir = await fixture();
		try {
			const files = await discover(dir, { include: ['src/**'] });
			expect(files).toEqual(['src/main.ts']);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('supports exclude globs', async () => {
		const dir = await fixture();
		try {
			const files = await discover(dir, { exclude: ['src/**'] });
			expect(files).not.toContain('src/main.ts');
			expect(files).toContain('nested/keep.ts');
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('can ignore gitignore rules', async () => {
		const dir = await fixture();
		try {
			const files = await discover(dir, { respectGitignore: false });
			expect(files).toContain('src/ignored.log');
			expect(files).not.toContain('node_modules/dep.js');
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
