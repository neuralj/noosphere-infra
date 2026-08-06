import { describe, expect, it } from 'vitest';
import { deriveStateFromPs, parsePsGoTemplate, parsePsJson } from '../docker';
import type { PsEntry } from '../docker';

describe('parsePsJson', () => {
	it('parses an array of entries', () => {
		const text = '[{"Service":"main","Name":"openlaputa-x-main-1","State":"running"},{"Service":"postgres","Name":"openlaputa-x-postgres-1","State":"running"}]';
		const entries = parsePsJson(text);
		expect(entries).toHaveLength(2);
		expect(entries[0].Service).toBe('main');
	});

	it('returns [] for empty or garbage input', () => {
		expect(parsePsJson('')).toEqual([]);
		expect(parsePsJson('not json')).toEqual([]);
		expect(parsePsJson('[}')).toEqual([]);
	});

	it('wraps a single object', () => {
		expect(parsePsJson('{"Service":"main","State":"running"}')).toHaveLength(1);
	});
});

describe('parsePsGoTemplate', () => {
	it('parses tab-separated name/service/state lines', () => {
		const text = 'openlaputa-x-main-1\tmain\trunning\nopenlaputa-x-postgres-1\tpostgres\texited';
		expect(parsePsGoTemplate(text)).toEqual([
			{ Name: 'openlaputa-x-main-1', Service: 'main', State: 'running' },
			{ Name: 'openlaputa-x-postgres-1', Service: 'postgres', State: 'exited' }
		]);
	});

	it('skips blank lines', () => {
		expect(parsePsGoTemplate('')).toEqual([]);
	});
});

describe('deriveStateFromPs', () => {
	const up: PsEntry = { Service: 'main', State: 'running' };
	const exited: PsEntry = { Service: 'main', State: 'exited' };

	it('returns stopped for empty entries', () => {
		expect(deriveStateFromPs([])).toBe('stopped');
	});

	it('returns running when any service is running', () => {
		expect(deriveStateFromPs([exited, up])).toBe('running');
	});

	it('returns stopped when all services exited', () => {
		expect(deriveStateFromPs([exited, { Service: 'postgres', State: 'exited' }])).toBe('stopped');
	});

	it('falls back to Status prefix when State is missing', () => {
		expect(deriveStateFromPs([{ Service: 'main', Status: 'Up 2 hours' }])).toBe('running');
		expect(deriveStateFromPs([{ Service: 'main', Status: 'Exited (0) 3 minutes ago' }])).toBe('stopped');
	});
});
