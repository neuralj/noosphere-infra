const START_RE = /@LLM_IGNORE_START\b/;
const END_RE = /@LLM_IGNORE_END\b/;

const HASH_RE = /^\s*#/;
const SLASH_RE = /^\s*\//;
const HTML_RE = /^\s*<!--/;
const DASH_RE = /^\s*--/;
const PCT_RE = /^\s*%/;

export function splitLinesKeepEnds(content: string): string[] {
	if (content === '') return [''];
	const lines: string[] = [];
	let start = 0;
	for (let i = 0; i < content.length; i++) {
		const ch = content[i];
		if (ch === '\n') {
			lines.push(content.slice(start, i + 1));
			start = i + 1;
		} else if (ch === '\r') {
			if (content[i + 1] === '\n') i += 1;
			lines.push(content.slice(start, i + 1));
			start = i + 1;
		}
	}
	if (start < content.length) lines.push(content.slice(start));
	return lines;
}

function eolOf(line: string): string {
	if (line.endsWith('\r\n')) return '\r\n';
	if (line.endsWith('\r')) return '\r';
	if (line.endsWith('\n')) return '\n';
	return '';
}

function placeholderFor(line: string): string {
	const indent = line.slice(0, line.length - line.trimStart().length);
	if (HTML_RE.test(line)) return `${indent}<!-- ... [hidden by @LLM_IGNORE] ... -->`;
	if (SLASH_RE.test(line)) return `${indent}// ... [hidden by @LLM_IGNORE] ...`;
	if (HASH_RE.test(line)) return `${indent}# ... [hidden by @LLM_IGNORE] ...`;
	if (DASH_RE.test(line)) return `${indent}-- ... [hidden by @LLM_IGNORE] ...`;
	if (PCT_RE.test(line)) return `${indent}% ... [hidden by @LLM_IGNORE] ...`;
	return `${indent}# ... [hidden by @LLM_IGNORE] ...`;
}

export function stripLLMIgnore(content: string): string {
	if (!content.includes('@LLM_IGNORE')) return content;

	const lines = splitLinesKeepEnds(content);
	const out: string[] = [];
	let skipping = false;
	let placeholder = '# ... [hidden by @LLM_IGNORE] ...';
	let eol = '\n';

	for (const line of lines) {
		if (line === '') continue;
		if (!skipping && START_RE.test(line)) {
			eol = eolOf(line) || eol;
			placeholder = placeholderFor(line);
			out.push(placeholder + eol);
			skipping = true;
			continue;
		}
		if (skipping && END_RE.test(line)) {
			out.push(placeholder + eol);
			skipping = false;
			continue;
		}
		if (skipping) {
			out.push(eol);
			continue;
		}
		out.push(line);
	}
	return out.join('');
}

export function formatMarkdownFile(
	relPath: string,
	content: string,
	lineRange: [number, number] | null = null,
	colRange: [number, number] | null = null
): string {
	const lang = relPath.includes('.')
		? (relPath.slice(relPath.lastIndexOf('.') + 1).toLowerCase() || 'text')
		: 'text';
	let header = `## File: \`${relPath}\``;
	if (lineRange !== null) {
		header += ` (lines ${lineRange[0]}-${lineRange[1]}`;
		if (colRange !== null) {
			header += `, chars ${colRange[0]}-${colRange[1]}`;
		}
		header += ')';
	}
	return `${header}\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
}

export function generateTree(files: string[]): string {
	const rels = [...files].sort();
	const lines = ['## Project Structure', '```text'];
	const printedDirs = new Set<string>();
	for (const rel of rels) {
		const parts = rel.split('/');
		for (let depth = 0; depth < parts.length - 1; depth++) {
			const dkey = parts.slice(0, depth + 1).join('/');
			if (!printedDirs.has(dkey)) {
				printedDirs.add(dkey);
				lines.push(`${'    '.repeat(depth)}${parts[depth]}/`);
			}
		}
		lines.push(`${'    '.repeat(parts.length - 1)}${parts[parts.length - 1]}`);
	}
	lines.push('```');
	return lines.join('\n');
}

export function commentPrefixFor(relPath: string): string {
	const lower = relPath.toLowerCase();
	const ext = lower.slice(lower.lastIndexOf('.'));
	const hashExts = new Set(['.py', '.sh', '.bash', '.zsh', '.yml', '.yaml', '.toml', '.cfg',
		'.ini', '.rb', '.pl', '.r', '.pyw', '.dockerfile', '.gitignore',
		'.makefile', '.cmake', '.bazel', '.bzl', '.tf', '.conf']);
	const slashExts = new Set(['.js', '.ts', '.jsx', '.tsx', '.c', '.h', '.cc', '.cpp', '.hpp',
		'.cs', '.java', '.go', '.rs', '.swift', '.kt', '.kts', '.scala',
		'.m', '.mm', '.dart', '.php', '.groovy', '.sol', '.lua', '.fs',
		'.fsx', '.ino']);
	const dashExts = new Set(['.sql', '.hs']);
	const pctExts = new Set(['.tex', '.erl']);

	if (hashExts.has(ext)) return '#';
	if (slashExts.has(ext)) return '//';
	if (dashExts.has(ext)) return '--';
	if (pctExts.has(ext)) return '%';
	if (ext === '.html' || ext === '.xml' || ext === '.svg' || ext === '.vue') return '<!-- -->';
	return '#';
}
