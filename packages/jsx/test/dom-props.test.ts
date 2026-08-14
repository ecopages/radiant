import { describe, expect, it } from 'vitest';
import { forEachNormalizedAttribute } from '../src/factory/attribute-normalize.ts';

describe('DOM prop forwarding', () => {
	it('gives direct aria and data attributes precedence over structured utilities', () => {
		const normalized: Array<[string, unknown]> = [];

		forEachNormalizedAttribute(
			{
				aria: { label: 'structured', describedby: 'description' },
				'aria-label': 'direct',
				data: { state: 'closed', source: 'structured' },
				'data-state': 'open',
			},
			(name, value) => normalized.push([name, value]),
		);

		expect(normalized).toEqual([
			['aria-describedby', 'description'],
			['aria-label', 'direct'],
			['data-source', 'structured'],
			['data-state', 'open'],
		]);
	});

	it('treats a direct null aria-label as a supplied value', () => {
		const normalized: Array<[string, unknown]> = [];

		forEachNormalizedAttribute(
			{
				aria: { label: 'structured' },
				'aria-label': null,
			},
			(name, value) => normalized.push([name, value]),
		);

		expect(normalized).toEqual([['aria-label', null]]);
	});
});
