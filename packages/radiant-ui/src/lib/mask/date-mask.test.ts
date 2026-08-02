import { describe, expect, it } from 'vitest';
import { applyDateMask, buildDateMaskPattern, getDefaultDatePlaceholder, maskedDigitsToParts, partsToDate } from './date-mask';

describe('applyDateMask', () => {
	it('inserts literals for en-US', () => {
		expect(applyDateMask('08212002', '00/00/0000')).toBe('08/21/2002');
	});
});

describe('getDefaultDatePlaceholder', () => {
	it('returns locale pattern hints', () => {
		expect(getDefaultDatePlaceholder('en-US')).toMatch(/mm.*dd.*yyyy/);
	});
});

describe('maskedDigitsToParts', () => {
	it('maps digits to parts for en-US', () => {
		const parts = maskedDigitsToParts('08212002', 'en-US');
		const date = partsToDate(parts ?? {});
		expect(date && [date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([2002, 8, 21]);
	});
});

describe('buildDateMaskPattern', () => {
	it('uses hash slots per locale', () => {
		expect(buildDateMaskPattern('en-US')).toBe('00/00/0000');
	});
});
