import { getEncoding } from 'js-tiktoken';
import type { Tiktoken, TiktokenEncoding } from 'js-tiktoken';

export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
	'gpt-4o': 128_000,
	'gpt-4o-mini': 128_000,
	'gpt-4-turbo': 128_000,
	'gpt-4': 8_192,
	'gpt-3.5-turbo': 16_385,
	'text-embedding-3-small': 8_191,
	'text-embedding-3-large': 8_191,
	'claude-3-5-sonnet': 200_000,
	'claude-3-opus': 200_000,
	'claude-3-haiku': 200_000,
	'claude-2': 100_000,
	'gemini-1.5-pro': 1_000_000,
	'gemini-1.5-flash': 1_000_000,
	'deepseek-chat': 64_000,
	'deepseek-coder': 64_000
};

// Models that use the o200k_base tokenizer (GPT-4o family). Everything else
// falls back to cl100k_base, matching tiktoken's behaviour for unknown models.
const MODEL_TO_ENCODING: Record<string, TiktokenEncoding> = {
	'gpt-4o': 'o200k_base',
	'gpt-4o-mini': 'o200k_base',
	'gpt-4-turbo': 'o200k_base'
};

export const DEFAULT_MODEL = 'gpt-4o';

// js-tiktoken's pure-JS BPE is quadratic on long inputs (1k chars ~90ms,
// 10k chars ~6.5s), so exact counting is only used for short text. Larger
// inputs fall back to the heuristic, which is fast and accurate enough for
// segment budgeting.
const EXACT_THRESHOLD = 2000;

const encCache = new Map<string, Tiktoken>();

function resolveEncoding(model: string): Tiktoken | null {
	const cached = encCache.get(model);
	if (cached) return cached;
	if (encCache.has(model)) return null; // previously failed
	try {
		const name = MODEL_TO_ENCODING[model] ?? 'cl100k_base';
		const enc = getEncoding(name);
		encCache.set(model, enc);
		return enc;
	} catch {
		encCache.set(model, undefined as unknown as Tiktoken);
		return null;
	}
}

export function countTokens(text: string, model: string = DEFAULT_MODEL): number {
	if (text.length > EXACT_THRESHOLD) {
		return Math.max(1, Math.floor(text.length / 4));
	}
	const enc = resolveEncoding(model);
	if (enc) {
		try {
			return enc.encode(text).length;
		} catch {
			// fall through to heuristic
		}
	}
	return Math.max(1, Math.floor(text.length / 4));
}

export function modelContextWindow(model: string): number {
	return MODEL_CONTEXT_WINDOWS[model] ?? 128_000;
}

export function defaultMaxTokens(model: string): number {
	return Math.floor(modelContextWindow(model) * 0.7);
}
