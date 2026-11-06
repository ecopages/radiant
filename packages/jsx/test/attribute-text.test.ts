import { describe, expect, test } from 'vitest';
import { resolveAttributeText } from '../src/factory/attribute-normalize.ts';

describe('resolveAttributeText', () => {
	test('skips undefined and null', () => {
		expect(resolveAttributeText('title', undefined)).toBeUndefined();
		expect(resolveAttributeText('title', null)).toBeUndefined();
	});

	test('stringifies values, including false and 0', () => {
		expect(resolveAttributeText('aria-hidden', false)).toBe('false');
		expect(resolveAttributeText('tabindex', 0)).toBe('0');
	});

	test('serializes a style object snapshot to declarations', () => {
		expect(resolveAttributeText('style', { backgroundColor: 'red', color: '' })).toBe('background-color: red');
		expect(resolveAttributeText('STYLE', 'color: red')).toBe('color: red');
	});

	test('presence yields an empty string for truthy values and skips falsy ones', () => {
		expect(resolveAttributeText('hidden', true, true)).toBe('');
		expect(resolveAttributeText('hidden', 'yes', true)).toBe('');
		expect(resolveAttributeText('hidden', false, true)).toBeUndefined();
		expect(resolveAttributeText('hidden', 0, true)).toBeUndefined();
	});
});
