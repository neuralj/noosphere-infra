import { readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { commentPrefixFor, splitLinesKeepEnds } from './format';
import type { ApplyStats, Finding } from './types';

export const MAX_FINDINGS = 2000;

const FINDING_RE = /\[(BUG|SUGGESTION|WARN)\]\s+filepath:(.+?)\s*\|\s*line:(\d+)\s*\|\s*msg:(.+)/;
const PATCH_BLOCK_RE = /```review-patch\s*\n(.*?)\n```/s;

export const REVIEW_PROMPT = `You are a senior code reviewer. Review the following project code segments.

Focus on: bugs, security issues, performance problems, and code quality.
Be concrete: cite the exact file path and the original line number.

IMPORTANT: At the end of your review, include a machine-readable summary in
this exact format inside a \`\`\`review-patch fenced block:

## Machine Readable Actions
\`\`\`review-patch
[BUG] filepath:src/app.py | line:12 | msg:Unhandled exception may crash the process
[SUGGESTION] filepath:src/lib.go | line:5 | msg:Add error handling
\`\`\`

Rules:
- Level must be one of: BUG, SUGGESTION, WARN
- filepath is relative to the project root
- line is the 1-based line number of the relevant code (preserved even when a
  file was split across segments; look for the "(lines X-Y)" marker)
- msg should be concise, in the same language as the surrounding code
`;

export function parseFindings(text: string): Finding[] {
	const match = PATCH_BLOCK_RE.exec(text);
	const target = match ? match[1] : text;

	const findings: Finding[] = [];
	for (const rawLine of target.split('\n')) {
		if (findings.length >= MAX_FINDINGS) break;
		const line = rawLine.trim();
		const m = FINDING_RE.exec(line);
		if (m) {
			findings.push({
				level: m[1] as Finding['level'],
				filepath: m[2].trim(),
				line: parseInt(m[3], 10),
				msg: m[4].trim()
			});
		}
	}
	return findings;
}

export async function applyFindings(
	findings: Finding[],
	projectRoot: string,
	dryRun = false
): Promise<ApplyStats> {
	if (findings.length > MAX_FINDINGS) {
		findings = findings.slice(0, MAX_FINDINGS);
	}

	const byFile = new Map<string, Finding[]>();
	for (const f of findings) {
		const list = byFile.get(f.filepath) ?? [];
		list.push(f);
		byFile.set(f.filepath, list);
	}

	const stats: ApplyStats = { applied: 0, skipped: 0, filesModified: [] };

	for (const [relPath, fileFindings] of byFile) {
		const absPath = resolve(join(projectRoot, relPath));
		if (!absPath.startsWith(resolve(projectRoot))) {
			stats.skipped += fileFindings.length;
			continue;
		}

		let lines: string[];
		let eol = '\n';
		try {
			const content = await readFile(absPath, 'utf-8');
			lines = splitLinesKeepEnds(content);
			if (content.includes('\r\n')) eol = '\r\n';
			else if (content.includes('\r')) eol = '\r';
		} catch {
			stats.skipped += fileFindings.length;
			continue;
		}

		const sorted = [...fileFindings].sort((a, b) => b.line - a.line);
		const prefix = commentPrefixFor(relPath);
		let appliedHere = 0;

		for (const finding of sorted) {
			const target = finding.line;
			if (target < 1 || target > lines.length) {
				stats.skipped += 1;
				continue;
			}
			const lineContent = lines[target - 1];
			const indent = lineContent.slice(0, lineContent.length - lineContent.trimStart().length);
			const comment = `${indent}${prefix} TODO (LLM_REVIEW)[${finding.level}]: ${finding.msg}${eol}`;
			if (!dryRun) {
				lines.splice(target - 1, 0, comment);
			}
			stats.applied += 1;
			appliedHere += 1;
		}

		if (!dryRun && appliedHere > 0) {
			await writeFile(absPath, lines.join(''), 'utf-8');
			stats.filesModified.push(relPath);
		}
	}

	return stats;
}
