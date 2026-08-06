export type PackFormat = 'markdown' | 'single' | 'jsonl' | 'xml';
export type PackProfile = 'review' | 'rag' | 'finetune' | 'context';

export interface PackConfig {
	root: string;
	out: string;
	maxTokens: number;
	model: string;
	format: PackFormat;
	profile: PackProfile;
	respectGitignore: boolean;
	includeTree: boolean;
	stripLLMIgnore: boolean;
	include: string[];
	exclude: string[];
	maxFileSize?: number;
}

export interface PackSummary {
	format: string;
	files: number;
	totalTokens: number;
	segments: number;
	outputs: string[];
	skippedLarge?: string[];
}

export interface StatsResult {
	root: string;
	model: string;
	files: number;
	totalTokens: number;
	maxTokens: number;
	estimatedSegments: number;
	largest: { path: string; tokens: number }[];
	skippedLarge?: string[];
}

export interface Finding {
	level: 'BUG' | 'SUGGESTION' | 'WARN';
	filepath: string;
	line: number;
	msg: string;
}

export interface ApplyStats {
	applied: number;
	skipped: number;
	filesModified: string[];
}
