import { describe, expect, test } from 'vitest';
import { listResolvedControls, resolveControlPresentation } from './heuristics';

describe('resolveControlPresentation', () => {
	test('maps scalar control types without looking at options', () => {
		expect(resolveControlPresentation({ control: { type: 'boolean' } }, ['a', 'b'])).toBe('boolean');
		expect(resolveControlPresentation({ control: { type: 'number' } }, [])).toBe('number');
		expect(resolveControlPresentation({ control: { type: 'text' } }, [])).toBe('text');
	});

	test('treats options-only args as select and applies the option-count table', () => {
		expect(resolveControlPresentation({}, [])).toBe('text');
		expect(resolveControlPresentation({ options: ['only'] }, ['only'])).toBe('select');
		expect(resolveControlPresentation({ options: ['a', 'b'] }, ['a', 'b'])).toBe('segmented');
		expect(resolveControlPresentation({ options: ['a', 'b', 'c', 'd'] }, ['a', 'b', 'c', 'd'])).toBe('select');
	});

	test('keeps authored radio for 2+ options and falls back like select otherwise', () => {
		expect(resolveControlPresentation({ control: { type: 'radio' } }, [])).toBe('text');
		expect(resolveControlPresentation({ control: { type: 'radio' }, options: ['a'] }, ['a'])).toBe('select');
		expect(resolveControlPresentation({ control: { type: 'radio' }, options: ['a', 'b'] }, ['a', 'b'])).toBe(
			'radio',
		);
	});
});

describe('listResolvedControls', () => {
	test('skips args that are not controls and attaches options only to choice kinds', () => {
		expect(
			listResolvedControls({
				argTypes: {
					ignored: {},
					on: { control: { type: 'boolean' } },
					side: { control: { type: 'radio' }, options: ['left', 'right'] },
				},
			}),
		).toEqual([
			{ name: 'on', kind: 'boolean' },
			{ name: 'side', kind: 'radio', options: ['left', 'right'] },
		]);
	});
});
