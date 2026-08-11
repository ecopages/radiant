import { describe, expect, test } from 'vitest';
import { applyControlOverrides } from './storybook-ssr.ts';

describe('applyControlOverrides', () => {
	test('replaces nested array args instead of spreading them into objects', () => {
		const merged = applyControlOverrides(
			{
				rows: [
					['Mon', 'Tue', 'Wed'],
					['A', 'B', 'C'],
				],
			},
			{
				rows: [
					['Mon', 'Tue', 'Wed'],
					['A', 'B', 'C'],
				],
			},
		);

		expect(merged.rows).toEqual([
			['Mon', 'Tue', 'Wed'],
			['A', 'B', 'C'],
		]);
		expect(Array.isArray((merged.rows as unknown[])[0])).toBe(true);
	});

	test('still deep-merges arrays of plain objects by index', () => {
		const merged = applyControlOverrides(
			{
				items: [
					{ id: 'a', label: 'Alpha' },
					{ id: 'b', label: 'Beta' },
				],
			},
			{
				items: [{ label: 'A1' }, { label: 'B1' }],
			},
		);

		expect(merged.items).toEqual([
			{ id: 'a', label: 'A1' },
			{ id: 'b', label: 'B1' },
		]);
	});

	test('replaces primitive array overrides wholesale', () => {
		const merged = applyControlOverrides({ tags: ['one', 'two'] }, { tags: ['one', 'two', 'three'] });

		expect(merged.tags).toEqual(['one', 'two', 'three']);
	});
});
