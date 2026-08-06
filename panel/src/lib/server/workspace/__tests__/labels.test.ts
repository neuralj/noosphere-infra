import { describe, expect, it } from 'vitest';
import { LABEL, parseLabels, sidecarLabels, toLabels } from '../labels';

describe('toLabels', () => {
	it('emits all four label keys', () => {
		const labels = toLabels('demo', 1234567890);
		expect(labels).toEqual({
			[LABEL.id]: 'demo',
			[LABEL.name]: 'demo',
			[LABEL.role]: 'main',
			[LABEL.createdAt]: '1234567890'
		});
	});
});

describe('parseLabels', () => {
	it('round-trips toLabels output', () => {
		const parsed = parseLabels(toLabels('demo', 42));
		expect(parsed).toEqual({ id: 'demo', name: 'demo', role: 'main', createdAt: '42' });
	});

	it('tolerates empty input', () => {
		expect(parseLabels({})).toEqual({
			id: undefined,
			name: undefined,
			role: undefined,
			createdAt: undefined
		});
	});
});

describe('sidecarLabels', () => {
	it('marks role as sidecar', () => {
		expect(sidecarLabels()).toEqual({ [LABEL.role]: 'sidecar' });
	});
});
