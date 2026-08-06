import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { applyFindings, parseFindings } from '../apply';

const REVIEW = `Some prose.

\`\`\`review-patch
[BUG] filepath:src/app.py | line:12 | msg:Unhandled exception may crash the process
[SUGGESTION] filepath:src/lib.go | line:5 | msg:Add error handling
[WARN] filepath:src/app.py | line:99 | msg:Out of range line
\`\`\`
`;

describe('parseFindings', () => {
	it('parses review-patch blocks', () => {
		const findings = parseFindings(REVIEW);
		expect(findings).toHaveLength(3);
		expect(findings[0]).toEqual({
			level: 'BUG',
			filepath: 'src/app.py',
			line: 12,
			msg: 'Unhandled exception may crash the process'
		});
	});

	it('returns nothing for plain text', () => {
		expect(parseFindings('no findings here')).toEqual([]);
	});
});

describe('applyFindings', () => {
	async function fixtureFile(): Promise<{ dir: string; file: string }> {
		const dir = await mkdtemp(join(tmpdir(), 'code2llm-apply-'));
		const file = join(dir, 'app.py');
		await writeFile(file, 'import os\n\ndef run():\n    return 1\n');
		return { dir, file };
	}

	it('dry-run applies nothing but reports counts', async () => {
		const { dir, file } = await fixtureFile();
		try {
			const stats = await applyFindings(
				[{ level: 'BUG', filepath: 'app.py', line: 1, msg: 'x' }],
				dir,
				true
			);
			expect(stats.applied).toBe(1);
			expect(stats.filesModified).toEqual([]);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('inserts TODO comments at the cited line', async () => {
		const { dir, file } = await fixtureFile();
		try {
			const stats = await applyFindings(
				[{ level: 'BUG', filepath: 'app.py', line: 3, msg: 'check this' }],
				dir,
				false
			);
			expect(stats.applied).toBe(1);
			expect(stats.filesModified).toEqual(['app.py']);
			const content = await import('fs/promises').then(fs => fs.readFile(file, 'utf-8'));
			expect(content).toContain('TODO (LLM_REVIEW)[BUG]: check this');
			expect(content).toContain('def run():');
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('skips out-of-range lines', async () => {
		const { dir } = await fixtureFile();
		try {
			const stats = await applyFindings(
				[{ level: 'WARN', filepath: 'app.py', line: 999, msg: 'nope' }],
				dir,
				false
			);
			expect(stats.applied).toBe(0);
			expect(stats.skipped).toBe(1);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('refuses paths outside the project root', async () => {
		const { dir } = await fixtureFile();
		try {
			const stats = await applyFindings(
				[{ level: 'BUG', filepath: '../etc/passwd', line: 1, msg: 'x' }],
				dir,
				false
			);
			expect(stats.skipped).toBe(1);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('preserves CRLF line endings when writing', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'code2llm-apply-'));
		const file = join(dir, 'win.py');
		await writeFile(file, 'a = 1\r\nb = 2\r\n');
		try {
			await applyFindings([{ level: 'SUGGESTION', filepath: 'win.py', line: 1, msg: 'note' }], dir, false);
			const content = await import('fs/promises').then(fs => fs.readFile(file, 'utf-8'));
			expect(content.includes('\r\n')).toBe(true);
			expect(content).toContain('TODO (LLM_REVIEW)[SUGGESTION]: note');
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
