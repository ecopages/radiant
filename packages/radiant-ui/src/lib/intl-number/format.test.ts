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

	it("returns null for text that has anything but the number and the formatter's own symbols", () => {
		expect(parseNumber('12abc', 'en-US')).toBeNull();
		expect(parseNumber('1.2.3', 'en-US')).toBeNull();
		expect(parseNumber('$12', 'en-US')).toBeNull();
		expect(parseNumber('12,5', 'de-DE')).toBe(12.5);
		expect(parseNumber('1,2,3', 'de-DE')).toBeNull();
	});

	it('reads back what formatNumber wrote: currency, percent, unit and the locale minus sign', () => {
		const usd = { style: 'currency', currency: 'USD' } as const;
		const eur = { style: 'currency', currency: 'EUR' } as const;
		const percent = { style: 'percent' } as const;
		const unit = { style: 'unit', unit: 'kilometer', unitDisplay: 'long' } as const;
		expect(parseNumber(formatNumber(1234.5, 'en-US', usd), 'en-US', usd)).toBe(1234.5);
		expect(parseNumber(formatNumber(-1234.5, 'en-US', usd), 'en-US', usd)).toBe(-1234.5);
		expect(parseNumber(formatNumber(1234.5, 'de-DE', eur), 'de-DE', eur)).toBe(1234.5);
		expect(parseNumber(formatNumber(0.5, 'en-US', percent), 'en-US', percent)).toBe(50);
		expect(parseNumber(formatNumber(12, 'en-US', unit), 'en-US', unit)).toBe(12);
		expect(parseNumber(formatNumber(1, 'en-US', unit), 'en-US', unit)).toBe(1);
		expect(parseNumber(formatNumber(-5, 'sv-SE'), 'sv-SE')).toBe(-5);
	});
});
