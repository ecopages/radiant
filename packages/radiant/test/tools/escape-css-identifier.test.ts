import { describe, expect, test } from 'vitest';
import { escapeCssIdentifier, escapeCssIdentifierFallback } from '../../src/tools/escape-css-identifier';

describe('escapeCssIdentifierFallback', () => {
	test('replaces NUL with the replacement character', () => {
		expect(escapeCssIdentifierFallback('\0')).toBe('\uFFFD');
	});

	test('escapes leading digits and hyphen-digit identifiers', () => {
		expect(escapeCssIdentifierFallback('1foo')).toBe('\\31 foo');
		expect(escapeCssIdentifierFallback('-1foo')).toBe('-\\31 foo');
	});

	test('escapes a lone hyphen and other non-identifier characters', () => {
		expect(escapeCssIdentifierFallback('-')).toBe('\\-');
		expect(escapeCssIdentifierFallback('a:b')).toBe('a\\:b');
	});

	test('leaves ordinary identifier characters unchanged', () => {
		expect(escapeCssIdentifierFallback('ref_1')).toBe('ref_1');
	});
});

describe('escapeCssIdentifier', () => {
	test('uses native CSS.escape when present, otherwise the fallback', () => {
		const expected =
			typeof globalThis.CSS?.escape === 'function' ? CSS.escape('1foo') : escapeCssIdentifierFallback('1foo');
		expect(escapeCssIdentifier('1foo')).toBe(expected);
	});
});
