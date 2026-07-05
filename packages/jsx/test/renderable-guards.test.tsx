import { describe, expect, test } from 'vitest';
import {
	isIterableRenderable,
	isJsxNodeLike,
	isSignalLikeValue,
	isTemplateResultLike,
	resolveReactiveSnapshot,
} from '../src/renderable-guards.ts';
import { RADIANT_TEMPLATE_RESULT, RADIANT_TEMPLATE_RESULT_FIELD, SUBSCRIBABLE_JSX_VALUE_SYMBOL } from '../src/types.ts';

function createTemplateResult(): import('../src/types.ts').TemplateResultLike {
	return {
		[RADIANT_TEMPLATE_RESULT_FIELD]: RADIANT_TEMPLATE_RESULT,
		strings: ['<p>', '</p>'] as unknown as TemplateStringsArray,
		values: ['hello'],
	};
}

function createArrayLikeTemplateShape(): object {
	return {
		[RADIANT_TEMPLATE_RESULT_FIELD]: RADIANT_TEMPLATE_RESULT,
		strings: { length: 1, 0: '<p>' },
		values: { length: 1, 0: 'hello' },
	};
}

describe('renderable-guards', () => {
	test('isTemplateResultLike accepts branded template results with array fields', () => {
		expect(isTemplateResultLike(createTemplateResult())).toBe(true);
	});

	test('isTemplateResultLike rejects array-like strings without real arrays', () => {
		expect(isTemplateResultLike(createArrayLikeTemplateShape())).toBe(false);
	});

	test('isTemplateResultLike rejects null and primitives', () => {
		expect(isTemplateResultLike(null)).toBe(false);
		expect(isTemplateResultLike('text')).toBe(false);
		expect(isTemplateResultLike(1)).toBe(false);
	});

	test('isJsxNodeLike accepts node-like objects', () => {
		expect(isJsxNodeLike({ nodeType: 1, outerHTML: '<p></p>' })).toBe(true);
		expect(isJsxNodeLike({})).toBe(false);
	});

	test('isIterableRenderable excludes strings', () => {
		expect(isIterableRenderable('abc')).toBe(false);
		expect(isIterableRenderable(['a', 'b'])).toBe(true);
	});

	test('isSignalLikeValue detects get/subscribe contract', () => {
		expect(
			isSignalLikeValue({
				get: () => 'value',
				subscribe: () => () => undefined,
			}),
		).toBe(true);
		expect(isSignalLikeValue({ get: () => 'value' })).toBe(false);
	});

	test('resolveReactiveSnapshot unwraps subscribable and signal wrappers', () => {
		const subscribable = {
			[SUBSCRIBABLE_JSX_VALUE_SYMBOL]: true as const,
			getValue: () => 'subscribable',
			subscribe: () => () => undefined,
		};

		expect(resolveReactiveSnapshot(subscribable)).toBe('subscribable');
		expect(
			resolveReactiveSnapshot({
				get: () => 'signal',
				subscribe: () => () => undefined,
			}),
		).toBe('signal');
		expect(resolveReactiveSnapshot('plain')).toBe('plain');
	});
});
