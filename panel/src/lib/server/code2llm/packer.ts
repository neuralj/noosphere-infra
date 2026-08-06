import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { discover } from './discovery';
import { formatMarkdownFile, generateTree, splitLinesKeepEnds, stripLLMIgnore } from './format';
import { countTokens } from './tokenize';
import type { PackConfig, PackSummary, StatsResult } from './types';

export const SAFETY_TOKENS = 256;
export const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;

function yieldToEventLoop(): Promise<void> {
	return new Promise(resolve => setImmediate(resolve));
}

interface Unit {
	path: string;
	content: string;
}

async function readUnits(
	files: string[],
	strip: boolean,
	maxFileSize: number
): Promise<{ units: Unit[]; skippedLarge: string[] }> {
	const units: Unit[] = [];
	const skippedLarge: string[] = [];
	for (let i = 0; i < files.length; i++) {
		if (i % 25 === 0) await yieldToEventLoop();
		const f = files[i];
		try {
			const s = await stat(f);
			if (s.size > maxFileSize) {
				skippedLarge.push(f);
				continue;
			}
			let text = await readFile(f, 'utf-8');
			if (strip) text = stripLLMIgnore(text);
			units.push({ path: f, content: text });
		} catch {
			continue;
		}
	}
	return { units, skippedLarge };
}

function renderHeader(projectName: string, model: string, totalFiles: number): string {
	return (
		`# Project: \`${projectName}\`\n\n` +
		`> Packed by code2llm for model \`${model}\`.\n` +
		`> Files included: ${totalFiles}\n`
	);
}

interface Chunk {
	text: string;
	startLine: number;
	endLine: number;
	startChar: number;
	endChar: number;
}

function splitLineByTokens(line: string, budget: number, model: string): { text: string; startChar: number; endChar: number }[] {
	const chunks: { text: string; startChar: number; endChar: number }[] = [];
	let pos = 0;
	while (pos < line.length) {
		let lo = 1;
		let hi = line.length - pos;
		while (lo < hi) {
			const mid = Math.ceil((lo + hi) / 2);
			if (countTokens(line.slice(pos, pos + mid), model) <= budget) lo = mid;
			else hi = mid - 1;
		}
		const end = pos + lo;
		chunks.push({ text: line.slice(pos, end), startChar: pos + 1, endChar: end });
		pos = end;
	}
	return chunks;
}

function splitFileByTokens(content: string, maxTokens: number, model: string): Chunk[] {
	const lines = splitLinesKeepEnds(content);
	const n = lines.length;
	const budget = Math.max(1, maxTokens - SAFETY_TOKENS);
	const out: Chunk[] = [];

	let start = 0;
	while (start < n) {
		let end = start;
		let used = 0;
		while (end < n) {
			const lt = countTokens(lines[end], model);
			if (used + lt > budget && end > start) break;
			if (used === 0 && lt > budget) break; // single line over budget
			used += lt;
			end += 1;
		}
		if (end === start) {
			const subChunks = splitLineByTokens(lines[start], budget, model);
			for (const c of subChunks) {
				out.push({ text: c.text, startLine: start + 1, endLine: start + 1, startChar: c.startChar, endChar: c.endChar });
			}
			start += 1;
			continue;
		}
		out.push({
			text: lines.slice(start, end).join(''),
			startLine: start + 1,
			endLine: end,
			startChar: 0,
			endChar: 0
		});
		start = end;
	}
	return out;
}

function fileBlock(rel: string, chunk: Chunk): string {
	const lang = rel.includes('.') ? rel.slice(rel.lastIndexOf('.') + 1) : 'text';
	const lineRange: [number, number] = [chunk.startLine, chunk.endLine];
	const colRange: [number, number] | null = chunk.startChar > 0 ? [chunk.startChar, chunk.endChar] : null;
	return formatMarkdownFile(rel, chunk.text, lineRange, colRange);
}

function buildMarkdownSegments(
	relFiles: string[],
	units: Unit[],
	cfg: PackConfig
): { segments: string[]; totalTokens: number } {
	const maxT = cfg.maxTokens;
	const tree = cfg.includeTree ? generateTree(relFiles) : '';
	const header = renderHeader(cfg.root.split('/').pop() || cfg.root, cfg.model, units.length);
	const headerBlock = header + (tree ? '\n' + tree + '\n\n' : '\n');
	const headerTokens = countTokens(headerBlock, cfg.model);

	const segments: string[] = [];
	let current: string[] = [headerBlock];
	let currentTokens = headerTokens;
	let totalTokens = headerTokens;

	for (const unit of units) {
		const rel = unit.path.startsWith(cfg.root + '/') ? unit.path.slice(cfg.root.length + 1) : unit.path;
		const block = formatMarkdownFile(rel, unit.content);
		const blkTokens = countTokens(block, cfg.model);
		totalTokens += blkTokens;

		if (blkTokens <= maxT - SAFETY_TOKENS) {
			if (currentTokens + blkTokens <= maxT - SAFETY_TOKENS) {
				current.push(block);
				currentTokens += blkTokens;
			} else {
				segments.push(current.join(''));
				current = [block];
				currentTokens = blkTokens;
			}
		} else {
			if (current.length > 1 || currentTokens > headerTokens) {
				segments.push(current.join(''));
				current = [];
				currentTokens = 0;
			}
			for (const chunk of splitFileByTokens(unit.content, maxT, cfg.model)) {
				segments.push(fileBlock(rel, chunk));
			}
		}
	}

	if (current.length > 0) {
		segments.push(current.join(''));
	}
	return { segments, totalTokens };
}

async function writeMarkdown(out: string, name: string, segments: string[]): Promise<string[]> {
	const written: string[] = [];
	for (let i = 0; i < segments.length; i++) {
		const p = `${name}_part_${String(i + 1).padStart(2, '0')}.md`;
		const note =
			`> **Segment ${i + 1} of ${segments.length}**\n` +
			`> If the project was split, review all parts together.\n\n`;
		await writeFile(join(out, p), note + segments[i], 'utf-8');
		written.push(p);
	}
	return written;
}

async function writeSingle(out: string, name: string, segments: string[]): Promise<string[]> {
	const p = `${name}_packed.md`;
	await writeFile(join(out, p), segments.join('\n\n---\n\n'), 'utf-8');
	return [p];
}

function relOf(root: string, absPath: string): string {
	return absPath.startsWith(root + '/') ? absPath.slice(root.length + 1) : absPath;
}

async function writeJsonl(out: string, name: string, root: string, units: Unit[], model: string): Promise<string[]> {
	const p = `${name}.jsonl`;
	const records = units.map(u => {
		const rel = relOf(root, u.path);
		const lang = rel.includes('.') ? rel.slice(rel.lastIndexOf('.') + 1) : 'text';
		return {
			path: rel,
			language: lang.toLowerCase(),
			tokens: countTokens(u.content, model),
			content: u.content
		};
	});
	const body = records.map(r => JSON.stringify(r)).join('\n') + '\n';
	await writeFile(join(out, p), body, 'utf-8');
	return [p];
}

async function writeXml(out: string, name: string, root: string, units: Unit[], model: string): Promise<string[]> {
	const parts: string[] = [];
	for (let idx = 0; idx < units.length; idx++) {
		const u = units[idx];
		const rel = relOf(root, u.path);
		const lang = rel.includes('.') ? rel.slice(rel.lastIndexOf('.') + 1) : 'text';
		parts.push(
			`<document index="${idx + 1}">\n` +
			`<source>${rel}</source>\n` +
			`<document_content>\n\`\`\`${lang}\n${u.content}\n\`\`\`\n` +
			`</document_content>\n` +
			`</document>`
		);
	}
	const doc = '<documents>\n' + parts.join('\n') + '\n</documents>\n';
	const p = `${name}.xml`;
	await writeFile(join(out, p), doc, 'utf-8');
	return [p];
}

async function writeManifest(
	out: string,
	name: string,
	cfg: PackConfig,
	files: number,
	tokens: number,
	segments: number,
	written: string[],
	skippedLarge: string[]
): Promise<string> {
	const manifest = {
		project: name,
		model: cfg.model,
		format: cfg.format,
		profile: cfg.profile,
		max_tokens_per_segment: cfg.maxTokens,
		files,
		total_tokens: tokens,
		segments,
		outputs: written,
		skipped_large: skippedLarge
	};
	await writeFile(join(out, `${name}_manifest.json`), JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
	return `${name}_manifest.json`;
}

export async function packProject(cfg: PackConfig): Promise<PackSummary> {
	const relFiles = await discover(cfg.root, {
		respectGitignore: cfg.respectGitignore,
		include: cfg.include.length ? cfg.include : undefined,
		exclude: cfg.exclude.length ? cfg.exclude : undefined
	});
	const absFiles = relFiles.map(f => join(cfg.root, f));
	const maxFileSize = cfg.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
	const { units, skippedLarge } = await readUnits(absFiles, cfg.stripLLMIgnore, maxFileSize);
	const name = cfg.root.split('/').pop() || 'project';

	await mkdir(cfg.out, { recursive: true });

	let summary: PackSummary;
	if (cfg.format === 'markdown' || cfg.format === 'single') {
		const { segments, totalTokens } = buildMarkdownSegments(relFiles, units, cfg);
		const written =
			cfg.format === 'single'
				? await writeSingle(cfg.out, name, segments)
				: await writeMarkdown(cfg.out, name, segments);
		const manifestFile = await writeManifest(cfg.out, name, cfg, relFiles.length, totalTokens, segments.length, written, skippedLarge);
		summary = {
			format: cfg.format,
			files: relFiles.length,
			totalTokens,
			segments: segments.length,
			outputs: [...written, manifestFile],
			skippedLarge: skippedLarge.map(f => relOf(cfg.root, f))
		};
	} else if (cfg.format === 'jsonl') {
		const written = await writeJsonl(cfg.out, name, cfg.root, units, cfg.model);
		const total = units.reduce((acc, u) => acc + countTokens(u.content, cfg.model), 0);
		const manifestFile = await writeManifest(cfg.out, name, cfg, relFiles.length, total, 1, written, skippedLarge);
		summary = {
			format: 'jsonl',
			files: relFiles.length,
			totalTokens: total,
			segments: 1,
			outputs: [...written, manifestFile],
			skippedLarge: skippedLarge.map(f => relOf(cfg.root, f))
		};
	} else {
		const written = await writeXml(cfg.out, name, cfg.root, units, cfg.model);
		const total = units.reduce((acc, u) => acc + countTokens(u.content, cfg.model), 0);
		const manifestFile = await writeManifest(cfg.out, name, cfg, relFiles.length, total, 1, written, skippedLarge);
		summary = {
			format: 'xml',
			files: relFiles.length,
			totalTokens: total,
			segments: 1,
			outputs: [...written, manifestFile],
			skippedLarge: skippedLarge.map(f => relOf(cfg.root, f))
		};
	}

	return summary;
}

export async function summarize(cfg: PackConfig): Promise<StatsResult> {
	const relFiles = await discover(cfg.root, {
		respectGitignore: cfg.respectGitignore,
		include: cfg.include.length ? cfg.include : undefined,
		exclude: cfg.exclude.length ? cfg.exclude : undefined
	});
	const maxFileSize = cfg.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
	const { units, skippedLarge } = await readUnits(relFiles.map(f => join(cfg.root, f)), cfg.stripLLMIgnore, maxFileSize);
	const perFile = units.map(u => {
		const rel = relOf(cfg.root, u.path);
		return { path: rel, tokens: countTokens(u.content, cfg.model) };
	});
	const total = perFile.reduce((acc, f) => acc + f.tokens, 0);
	const largest = [...perFile].sort((a, b) => b.tokens - a.tokens).slice(0, 10);
	return {
		root: cfg.root,
		model: cfg.model,
		files: relFiles.length,
		totalTokens: total,
		maxTokens: cfg.maxTokens,
		estimatedSegments: Math.max(1, Math.ceil(total / Math.max(1, cfg.maxTokens - SAFETY_TOKENS))),
		largest,
		skippedLarge: skippedLarge.map(f => relOf(cfg.root, f))
	};
}
