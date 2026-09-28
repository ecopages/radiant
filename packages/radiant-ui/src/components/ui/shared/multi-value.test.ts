import { describe, expect, it } from 'vitest';
import {
	multiValuePropOptions,
	multiValueTransform,
	numberArrayTransform,
	parseMultiValue,
	parseViewValue,
	serializeMultiValue,
} from './multi-value';

describe('parseMultiValue', () => {
	it('splits, trims, and uniques comma-separated tokens', () => {
		expect(parseMultiValue(' draft, published ,draft ')).toEqual(['draft', 'published']);
	});

	it('returns an empty array for empty input', () => {
		expect(parseMultiValue(undefined)).toEqual([]);
		expect(parseMultiValue('')).toEqual([]);
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

describe('multiValueTransform', () => {
	it('round-trips comma-separated attributes and property writes', () => {
		expect(multiValueTransform.fromAttribute?.('ca,tx')).toEqual(['ca', 'tx']);
		expect(multiValueTransform.toAttribute?.(['ca', 'tx'])).toBe('ca,tx');
		expect(multiValueTransform.toAttribute?.([])).toBeNull();
		expect(multiValueTransform.fromProperty?.('ca,tx')).toEqual(['ca', 'tx']);
		expect(multiValueTransform.fromProperty?.(['ca', 'tx'])).toEqual(['ca', 'tx']);
	});
});

describe('multiValuePropOptions', () => {
	it('uses the shared transform and empty default', () => {
		expect(multiValuePropOptions.transform).toBe(multiValueTransform);
		expect(multiValuePropOptions.reflect).toBe(true);
	});
});

describe('numberArrayTransform', () => {
	it('round-trips comma-separated numeric attributes and property writes', () => {
		expect(numberArrayTransform.fromAttribute?.('25,75')).toEqual([25, 75]);
		expect(numberArrayTransform.toAttribute?.([25, 75])).toBe('25,75');
		expect(numberArrayTransform.fromProperty?.(50)).toEqual([50]);
	});
});
