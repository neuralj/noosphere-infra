import { readFile } from 'fs/promises';
import { join } from 'path';
import { findRepoRoot } from './repo.js';

export type LayerName = 'value' | 'rule' | 'structure' | 'concept' | 'perception';

export interface LayerContent {
	exists: boolean;
	content: string;
	sections: string[];
	completeness: number;
}

export interface AlignmentContent {
	raw: string;
	path: string;
	layers: Record<LayerName, LayerContent>;
	metadata: {
		lastModified: string;
		wordCount: number;
		hasMetacognition: boolean;
		hasKnowledgeNetwork: boolean;
		exists: boolean;
	};
}

export interface AlignmentScore {
	overall: number;
	layers: Record<LayerName, number>;
	suggestions: string[];
	goals: Record<LayerName, LayerGoal[]>;
	goalsProgress: Record<LayerName, { total: number; completed: number; pending: number }>;
	structureCheck: Record<LayerName, number>;
}

export interface LayerGoal {
	text: string;
	completed: boolean;
	layer: LayerName;
}

const LAYER_LABELS: Record<LayerName, string> = {
	value: 'Purpose',
	rule: 'Constraints',
	structure: 'Architecture',
	concept: 'Glossary',
	perception: 'Operations'
};

const LAYER_PATTERNS: Record<LayerName, RegExp[]> = {
	value: [/【1】Purpose/, /##\s*Purpose/, /#\s*Purpose/],
	rule: [/【2】Constraints/, /##\s*Constraints/, /#\s*Constraints/],
	structure: [/【3】Architecture/, /##\s*Architecture/, /#\s*Architecture/],
	concept: [/【4】Glossary/, /##\s*Glossary/, /#\s*Glossary/],
	perception: [/【5】Operations/, /##\s*Operations/, /#\s*Operations/]
};

function parseLayer(content: string, layer: LayerName): LayerContent {
	const patterns = LAYER_PATTERNS[layer];
	let exists = false;
	let layerContent = '';

	for (const pattern of patterns) {
		const match = content.match(pattern);
		if (match) {
			exists = true;
			const startIndex = match.index!;
			const nextLayerPattern = /【\d】|##\s*(?:Purpose|Constraints|Architecture|Glossary|Operations)/;
			const rest = content.slice(startIndex + match[0].length);
			const nextMatch = rest.match(nextLayerPattern);
			const endIndex = nextMatch ? nextMatch.index! : rest.length;
			layerContent = rest.slice(0, endIndex).trim();
			break;
		}
	}

	const sections = layerContent
		.split(/^#{2,3}\s+/m)
		.filter(s => s.trim())
		.map(s => s.split('\n')[0].trim())
		.filter(s => s.length > 0);

	let completeness = 0;
	if (!exists) {
		completeness = 0;
	} else {
		const lines = layerContent.split('\n').filter(l => l.trim());
		const bulletPoints = lines.filter(l => /^[-*]\s/.test(l.trim())).length;
		const tableRows = lines.filter(l => /^\|[^-]/.test(l.trim())).length;
		if (layer === 'value') {
			const hasPosition = /核心定位|定位/.test(layerContent);
			const hasBoundary = /不做|边界|取舍/.test(layerContent);
			const hasPriority = /优先级/.test(layerContent);
			completeness = Math.min(100, (hasPosition ? 34 : 0) + (hasBoundary ? 33 : 0) + (hasPriority ? 33 : 0));
		} else if (layer === 'rule') {
			const hasConstraints = /硬约束|约束/.test(layerContent);
			const hasRuntime = /运行|进程|日志/.test(layerContent);
			completeness = Math.min(100, (hasConstraints ? 50 : 0) + (hasRuntime ? 50 : 0));
		} else if (layer === 'concept') {
			const hasTerms = /术语|定义|Terms/.test(layerContent);
			const hasAbbrev = /缩写|全称|Abbrev/.test(layerContent);
			const termScore = Math.min(50, tableRows * 3);
			completeness = Math.min(100, termScore + (hasTerms ? 25 : 0) + (hasAbbrev ? 25 : 0));
		} else {
			completeness = Math.min(100, bulletPoints * 15 + (lines.length > 3 ? 30 : 0));
		}
	}

	return { exists, content: layerContent, sections, completeness };
}

function parseGoals(layerContent: string, layer: LayerName): LayerGoal[] {
	const goals: LayerGoal[] = [];
	const lines = layerContent.split('\n');
	
	for (const line of lines) {
		// 匹配 checkbox: - [ ] 或 - [x]
		const match = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
		if (match) {
			const completed = match[1].toLowerCase() === 'x';
			const text = match[2].trim();
			goals.push({ text, completed, layer });
		}
	}
	
	return goals;
}

export async function getAlignmentContent(): Promise<AlignmentContent> {
	const root = findRepoRoot();
	const agentsPaths = [join(root, 'AGENTS.md'), join(root, 'CLAUDE.md')];

	let raw = '';
	let path = '';
	let exists = false;
	let lastModified = '';

	for (const p of agentsPaths) {
		try {
			raw = await readFile(p, 'utf-8');
			path = p;
			exists = true;
			const { statSync } = await import('fs');
			const stat = statSync(p);
			lastModified = stat.mtime.toISOString();
			break;
		} catch {
			continue;
		}
	}

	const layers: Record<LayerName, LayerContent> = {
		value: parseLayer(raw, 'value'),
		rule: parseLayer(raw, 'rule'),
		structure: parseLayer(raw, 'structure'),
		concept: parseLayer(raw, 'concept'),
		perception: parseLayer(raw, 'perception')
	};

	const wordCount = raw.split(/\s+/).filter(w => w).length;
	const hasMetacognition = /元认知/.test(raw);
	const hasKnowledgeNetwork = /知识.*网络|三层.*知识/.test(raw);

	return {
		raw,
		path,
		layers,
		metadata: { lastModified, wordCount, hasMetacognition, hasKnowledgeNetwork, exists }
	};
}

export function calculateScore(layers: Record<LayerName, LayerContent>): AlignmentScore {
	const goals: Record<LayerName, LayerGoal[]> = {
		value: parseGoals(layers.value.content, 'value'),
		rule: parseGoals(layers.rule.content, 'rule'),
		structure: parseGoals(layers.structure.content, 'structure'),
		concept: parseGoals(layers.concept.content, 'concept'),
		perception: parseGoals(layers.perception.content, 'perception')
	};

	const goalsProgress: Record<LayerName, { total: number; completed: number; pending: number }> = {
		value: { total: 0, completed: 0, pending: 0 },
		rule: { total: 0, completed: 0, pending: 0 },
		structure: { total: 0, completed: 0, pending: 0 },
		concept: { total: 0, completed: 0, pending: 0 },
		perception: { total: 0, completed: 0, pending: 0 }
	};

	for (const [layer, layerGoals] of Object.entries(goals)) {
		const layerName = layer as LayerName;
		goalsProgress[layerName].total = layerGoals.length;
		goalsProgress[layerName].completed = layerGoals.filter(g => g.completed).length;
		goalsProgress[layerName].pending = layerGoals.filter(g => !g.completed).length;
	}

	const layerScores: Record<LayerName, number> = { value: 0, rule: 0, structure: 0, concept: 0, perception: 0 };
	for (const [layer, progress] of Object.entries(goalsProgress)) {
		const layerName = layer as LayerName;
		if (progress.total > 0) {
			layerScores[layerName] = Math.round((progress.completed / progress.total) * 100);
		} else {
			layerScores[layerName] = layers[layerName].completeness;
		}
	}

	const overall = Math.round(
		Object.values(layerScores).reduce((sum, v) => sum + v, 0) / 5
	);

	const structureCheck: Record<LayerName, number> = {
		value: layers.value.completeness,
		rule: layers.rule.completeness,
		structure: layers.structure.completeness,
		concept: layers.concept.completeness,
		perception: layers.perception.completeness
	};

	const suggestions: string[] = [];
	for (const [layer, layerGoals] of Object.entries(goals)) {
		const pendingGoals = layerGoals.filter(g => !g.completed);
		if (pendingGoals.length > 0) {
			const layerName = LAYER_LABELS[layer as LayerName];
			const goalTexts = pendingGoals.slice(0, 3).map(g => g.text).join('、');
			const more = pendingGoals.length > 3 ? `等 ${pendingGoals.length} 项` : '';
			suggestions.push(`${layerName}：${goalTexts}${more}`);
		}
	}

	return { overall, layers: layerScores, suggestions, goals, goalsProgress, structureCheck };
}
