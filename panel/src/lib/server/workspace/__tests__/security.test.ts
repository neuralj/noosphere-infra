import { describe, expect, it } from 'vitest';
import { resolve } from 'path';
import { assertAllowedRepo, assertValidWorkspaceId } from '../security';

const ROOTS = ['/repos/a', '/repos/b'];

describe('assertAllowedRepo', () => {
	it('accepts a path inside a root', () => {
		expect(assertAllowedRepo('/repos/a/src/main.ts', ROOTS)).toBe(resolve('/repos/a/src/main.ts'));
	});

	it('accepts a path equal to a root', () => {
		expect(assertAllowedRepo('/repos/b', ROOTS)).toBe(resolve('/repos/b'));
	});

	it('rejects a path outside all roots', () => {
		expect(() => assertAllowedRepo('/etc/passwd', ROOTS)).toThrow(/not allowed/);
	});

	it('rejects traversal that escapes a root', () => {
		expect(() => assertAllowedRepo('/repos/a/../../etc/passwd', ROOTS)).toThrow(/not allowed/);
	});

	it('accepts traversal that stays inside a root', () => {
		expect(assertAllowedRepo('/repos/a/sub/../file.ts', ROOTS)).toBe(resolve('/repos/a/file.ts'));
	});

	it('matches a root that is a prefix, not a sibling', () => {
		expect(() => assertAllowedRepo('/repos/a-other/x', ROOTS)).toThrow(/not allowed/);
	});
});

describe('assertValidWorkspaceId', () => {
	it('accepts slug-shaped ids', () => {
		expect(assertValidWorkspaceId('demo')).toBe('demo');
		expect(assertValidWorkspaceId('opensheeta-dev')).toBe('opensheeta-dev');
		expect(assertValidWorkspaceId('a.b_c-1')).toBe('a.b_c-1');
	});

	it('rejects path traversal and dangerous characters', () => {
		expect(() => assertValidWorkspaceId('..')).toThrow(/Invalid workspace id/);
		expect(() => assertValidWorkspaceId('a/b')).toThrow(/Invalid workspace id/);
		expect(() => assertValidWorkspaceId('../x')).toThrow(/Invalid workspace id/);
		expect(() => assertValidWorkspaceId('A')).toThrow(/Invalid workspace id/);
		expect(() => assertValidWorkspaceId('a b')).toThrow(/Invalid workspace id/);
		expect(() => assertValidWorkspaceId('-x')).toThrow(/Invalid workspace id/);
		expect(() => assertValidWorkspaceId('')).toThrow(/Invalid workspace id/);
	});

	it('rejects over-long ids', () => {
		expect(() => assertValidWorkspaceId('a'.repeat(65))).toThrow(/Invalid workspace id/);
		expect(assertValidWorkspaceId('a'.repeat(64))).toBe('a'.repeat(64));
	});
});
