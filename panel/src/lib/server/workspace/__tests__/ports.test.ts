import { describe, expect, it } from 'vitest';
import { parsePortOutput } from '../ports';

describe('parsePortOutput', () => {
	it('parses 0.0.0.0:port', () => {
		expect(parsePortOutput('0.0.0.0:54321')).toBe(54321);
	});

	it('parses [::]:port', () => {
		expect(parsePortOutput('[::]:8888')).toBe(8888);
	});

	it('parses trailing whitespace', () => {
		expect(parsePortOutput('  0.0.0.0:3306  \n')).toBe(3306);
	});

	it('returns null for empty or non-port output', () => {
		expect(parsePortOutput('')).toBeNull();
		expect(parsePortOutput('No port published')).toBeNull();
		expect(parsePortOutput('0.0.0.0:')).toBeNull();
	});
});
