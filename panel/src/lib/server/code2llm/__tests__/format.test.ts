import { describe, expect, it } from 'vitest';
import { commentPrefixFor, formatMarkdownFile, generateTree, splitLinesKeepEnds, stripLLMIgnore } from '../format';

describe('splitLinesKeepEnds', () => {
	it('preserves line terminators', () => {
		expect(splitLinesKeepEnds('a\nb\r\nc')).toEqual(['a\n', 'b\r\n', 'c']);
	});

	it('round-trips content', () => {
		const content = 'line1\r\nline2\nline3\r\n';
		expect(splitLinesKeepEnds(content).join('')).toBe(content);
	});
});

describe('stripLLMIgnore', () => {
	it('strips a block and preserves line count', () => {
		const input = 'import os\n\n# @LLM_IGNORE_START\ndef _secret():\n    password = "hunter2"\n# @LLM_IGNORE_END\n\ndef public():\n    return 1\n';
		const out = stripLLMIgnore(input);
		expect(out.split('\n')).toHaveLength(input.split('\n').length);
		expect(out).not.toContain('hunter2');
		expect(out).toContain('# ... [hidden by @LLM_IGNORE] ...');
		expect(out).toContain('return 1');
	});

	it('detects // comment style', () => {
		const input = '// @LLM_IGNORE_START\nsecret();\n// @LLM_IGNORE_END';
		const out = stripLLMIgnore(input);
		expect(out).toContain('// ... [hidden by @LLM_IGNORE] ...');
	});

	it('preserves CRLF', () => {
		const input = '# @LLM_IGNORE_START\r\nx = 1\r\n# @LLM_IGNORE_END\r\ny = 2\r\n';
		const out = stripLLMIgnore(input);
		expect(out).toContain('\r\n');
		expect(out.split('\r\n').length).toBe(5);
		expect(out).not.toContain('x = 1');
	});

	it('returns content unchanged when no marker', () => {
		const input = 'hello\nworld';
		expect(stripLLMIgnore(input)).toBe(input);
	});
});

describe('formatMarkdownFile', () => {
	it('renders a fenced block with relative path', () => {
		const out = formatMarkdownFile('src/app.py', 'print(1)');
		expect(out).toContain('## File: `src/app.py`');
		expect(out).toContain('```py');
		expect(out).toContain('print(1)');
	});

	it('adds line and char ranges', () => {
		const out = formatMarkdownFile('a.txt', 'x', [3, 5], [10, 20]);
		expect(out).toContain('(lines 3-5, chars 10-20)');
	});
});

describe('generateTree', () => {
	it('prints dirs once and indents files', () => {
		const tree = generateTree(['src/a.ts', 'src/b.ts', 'tests/x.test.ts']);
		expect(tree).toContain('src/');
		expect(tree).toContain('tests/');
		expect(tree).toContain('    a.ts');
		expect(tree.indexOf('src/')).toBeLessThan(tree.indexOf('a.ts'));
	});
});

describe('commentPrefixFor', () => {
	it('maps extensions to comment styles', () => {
		expect(commentPrefixFor('a.py')).toBe('#');
		expect(commentPrefixFor('a.go')).toBe('//');
		expect(commentPrefixFor('a.sql')).toBe('--');
		expect(commentPrefixFor('a.tex')).toBe('%');
		expect(commentPrefixFor('a.html')).toBe('<!-- -->');
		expect(commentPrefixFor('a.unknown')).toBe('#');
	});
});
