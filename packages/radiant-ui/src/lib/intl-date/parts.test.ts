import { describe, expect, it } from 'vitest';
import { dateToIso, isoToDate } from './iso';
import { getDatePartOrder, parseLocaleDateString } from './parts';

describe('iso', () => {
	it('round-trips valid dates', () => {
		const date = new Date(2026, 11, 9);
		expect(dateToIso(date)).toBe('2026-12-09');
		expect(isoToDate('2026-12-09')).toEqual(date);
	});

	it('rejects invalid calendar dates', () => {
		expect(isoToDate('2026-02-30')).toBeNull();
	});
});

describe('getDatePartOrder', () => {
	it('returns MDY for en-US', () => {
		expect(getDatePartOrder('en-US')).toEqual(['month', 'day', 'year']);
	});

	it('returns DMY for en-GB', () => {
		expect(getDatePartOrder('en-GB')).toEqual(['day', 'month', 'year']);
	});
});

describe('parseLocaleDateString', () => {
	it('parses ISO strings', () => {
		expect(parseLocaleDateString('2026-12-09', 'en-US')?.getDate()).toBe(9);
	});

	it('parses en-US numeric input', () => {
		const parsed = parseLocaleDateString('12/9/2026', 'en-US');
		expect(dateToIso(parsed!)).toBe('2026-12-09');
	});

	it('parses en-GB numeric input', () => {
		const parsed = parseLocaleDateString('9/12/2026', 'en-GB');
		expect(dateToIso(parsed!)).toBe('2026-12-09');
	});
});
