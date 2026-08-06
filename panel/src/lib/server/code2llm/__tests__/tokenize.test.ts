import { describe, expect, it } from 'vitest';
import { countTokens, defaultMaxTokens, modelContextWindow } from '../tokenize';

describe('countTokens', () => {
	it('counts with the real tokenizer for known models', () => {
		expect(countTokens('hello world', 'gpt-4o')).toBeGreaterThan(0);
	});

	it('counts empty text as zero tokens', () => {
		expect(countTokens('', 'gpt-4o')).toBe(0);
	});

	it('unknown models tokenize via cl100k_base fallback', () => {
		expect(countTokens('abcdefghijkl', 'unknown-model-xyz')).toBeGreaterThan(0);
	});

	it('unknown models still tokenize via cl100k_base', () => {
		expect(countTokens('hello world', 'claude-3-5-sonnet')).toBeGreaterThan(0);
	});
});

describe('modelContextWindow', () => {
	it('returns known windows', () => {
		expect(modelContextWindow('gpt-4o')).toBe(128_000);
		expect(modelContextWindow('deepseek-chat')).toBe(64_000);
	});

	it('defaults to 128k for unknown models', () => {
		expect(modelContextWindow('some-future-model')).toBe(128_000);
	});
});

describe('defaultMaxTokens', () => {
	it('is 70% of the window', () => {
		expect(defaultMaxTokens('gpt-4o')).toBe(89_600);
	});
});
