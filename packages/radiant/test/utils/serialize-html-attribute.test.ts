import { describe, expect, test } from 'vitest';
import { serializeHtmlAttribute } from '../../src/utils/serialize-html-attribute';

describe('serializeHtmlAttribute', () => {
	test('emits boolean presence form for empty values', () => {
		expect(serializeHtmlAttribute('disabled', '')).toBe(' disabled');
		expect(serializeHtmlAttribute('disabled', null)).toBe(' disabled');
		expect(serializeHtmlAttribute('disabled', undefined)).toBe(' disabled');
	});

	test('escapes non-empty attribute values', () => {
		expect(serializeHtmlAttribute('title', 'a < b & "c"')).toBe(' title="a &lt; b &amp; &quot;c&quot;"');
	});

	test('rejects invalid attribute names', () => {
		expect(() => serializeHtmlAttribute('onerror="x" data-x', '1')).toThrow(/Invalid HTML attribute name/);
	});
});
