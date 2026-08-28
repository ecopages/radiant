import { describe, expect, it } from 'vitest';
import { parseMultiValue, parseViewValue, serializeMultiValue, serializeViewValue } from './multi-value';

describe('parseMultiValue', () => {
	it('splits, trims, and uniques comma-separated tokens', () => {
		expect(parseMultiValue(' draft, published ,draft ')).toEqual(['draft', 'published']);
	});

	it('returns an empty array for empty input', () => {
		expect(parseMultiValue(undefined)).toEqual([]);
		expect(parseMultiValue('')).toEqual([]);
	});
});

describe('serializeViewValue', () => {
	it('passes strings through as the host protocol', () => {
		expect(serializeViewValue('draft')).toBe('draft');
		expect(serializeViewValue('draft,published')).toBe('draft,published');
	});

	it('joins arrays into the host protocol', () => {
		expect(serializeViewValue(['draft', 'published'])).toBe('draft,published');
		expect(serializeViewValue([' draft ', 'published', 'draft'])).toBe('draft,published');
	});

	it('omits undefined', () => {
		expect(serializeViewValue(undefined)).toBeUndefined();
		expect(serializeViewValue([])).toBe('');
	});
});

describe('parseViewValue', () => {
	it('reads both string and array view values as token arrays', () => {
		expect(parseViewValue('draft,published')).toEqual(['draft', 'published']);
		expect(parseViewValue(['draft', 'published'])).toEqual(['draft', 'published']);
	});
});

describe('serializeMultiValue', () => {
	it('joins tokens without re-trimming', () => {
		expect(serializeMultiValue(['draft', 'published'])).toBe('draft,published');
	});
});
