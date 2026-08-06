import type { PackConfig, PackFormat, PackProfile } from './types';

export const SUPPORTED_FORMATS: PackFormat[] = ['markdown', 'single', 'jsonl', 'xml'];
export const SUPPORTED_PROFILES: PackProfile[] = ['review', 'rag', 'finetune', 'context'];

export interface ProfileDefaults {
	format: PackFormat;
	includeTree: boolean;
	maxTokens: number;
	model: string;
}

export const PROFILES: Record<PackProfile, ProfileDefaults> = {
	review: {
		format: 'markdown',
		includeTree: true,
		maxTokens: 100_000,
		model: 'gpt-4o'
	},
	rag: {
		format: 'jsonl',
		includeTree: false,
		maxTokens: 8_000,
		model: 'text-embedding-3-small'
	},
	finetune: {
		format: 'jsonl',
		includeTree: false,
		maxTokens: 6_000,
		model: 'gpt-4o-mini'
	},
	context: {
		format: 'xml',
		includeTree: false,
		maxTokens: 150_000,
		model: 'claude-3-5-sonnet'
	}
};

export function makeConfig(
	root: string,
	out: string,
	overrides: Partial<PackConfig> = {}
): PackConfig {
	const profile = overrides.profile ?? 'review';
	const base = PROFILES[profile] ?? PROFILES.review;
	return {
		root,
		out,
		maxTokens: overrides.maxTokens ?? base.maxTokens,
		model: overrides.model ?? base.model,
		format: overrides.format ?? base.format,
		profile,
		respectGitignore: overrides.respectGitignore ?? true,
		includeTree: overrides.includeTree ?? base.includeTree,
		stripLLMIgnore: overrides.stripLLMIgnore ?? true,
		include: overrides.include ?? [],
		exclude: overrides.exclude ?? [],
		maxFileSize: overrides.maxFileSize
	};
}
