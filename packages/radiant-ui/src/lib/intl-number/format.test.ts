import { describe, expect, it } from 'vitest';
import { formatEditableNumber, formatNumber, parseNumber } from './format';

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

describe('formatEditableNumber', () => {
	it('writes digits without grouping and the decimal separator of the locale', () => {
		expect(formatEditableNumber(1234.5, 'de-DE')).toBe('1234,5');
		expect(formatEditableNumber(1234.5, 'en-US')).toBe('1234.5');
		expect(formatEditableNumber(-1234, 'de-DE')).toBe('-1234');
		expect(formatEditableNumber(1234.5, 'de-CH')).toBe('1234.5');
	});

	it('is read back by parseNumber to the same number, in locales that group with a dot, a comma or a space', () => {
		for (const locale of ['de-DE', 'en-US', 'de-CH', 'fr-FR', 'es-ES', 'pt-BR', 'sv-SE']) {
			for (const value of [0, 12, -1234, 1234.5, 1234567.891, 0.25]) {
				expect(parseNumber(formatEditableNumber(value, locale), locale)).toBe(value);
			}
		}
	});

	it('uses the decimal separator of the format options, as parseNumber does', () => {
		const options = { style: 'currency', currency: 'EUR' } as const;
		expect(parseNumber(formatEditableNumber(1234.5, 'de-DE', options), 'de-DE', options)).toBe(1234.5);
	});

	it('agrees with parseNumber when the options round the probe numbers and leave no decimal separator to find', () => {
		const options = { maximumSignificantDigits: 3 } as const;
		const text = formatEditableNumber(1234.5, 'fr-FR', options);

		expect(parseNumber(text, 'fr-FR', options)).toBe(1234.5);

		const german = formatEditableNumber(1234.5, 'de-DE', options);
		expect(german).toBe('1234,5');
		expect(parseNumber(german, 'de-DE', options)).toBe(1234.5);
	});

	it('is empty for a value that is not finite', () => {
		expect(formatEditableNumber(Number.NaN, 'de-DE')).toBe('');
		expect(formatEditableNumber(Number.POSITIVE_INFINITY, 'de-DE')).toBe('');
	});
});
