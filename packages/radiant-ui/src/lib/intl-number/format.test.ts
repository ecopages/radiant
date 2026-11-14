import { describe, expect, it } from 'vitest';
import { formatNumber, parseNumber } from './format';

describe('parseNumber', () => {
	it('reads a locale formatted number', () => {
		expect(parseNumber('1,234.5', 'en-US')).toBe(1234.5);
		expect(parseNumber('1.234,5', 'de-DE')).toBe(1234.5);
		expect(parseNumber('-12', 'en-US')).toBe(-12);
	});

	it('returns null for empty text and for text without a digit, as a native number input holds no value', () => {
		expect(parseNumber('', 'en-US')).toBeNull();
		expect(parseNumber('   ', 'en-US')).toBeNull();
		expect(parseNumber('abc', 'en-US')).toBeNull();
		expect(parseNumber('-', 'en-US')).toBeNull();
		expect(parseNumber('.', 'en-US')).toBeNull();
	});

	it('reads back what formatNumber wrote, including currency symbols', () => {
		const options = { style: 'currency', currency: 'USD' } as const;
		expect(parseNumber(formatNumber(1234.5, 'en-US', options), 'en-US', options)).toBe(1234.5);
	});
});
