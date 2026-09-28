import { describe, expect, it } from 'vitest';
import { buildCalendarMonth } from './calendar';
import { addMonths, getVisibleMonthViews } from './months';
import {
	advanceRangeSelection,
	getDaySelectionAppearance,
	normalizeRange,
	parseIsoRange,
	parseMultipleIsos,
	serializeIsoRange,
	serializeMultipleIsos,
	toggleMultipleIso,
} from './selection';

describe('selection utilities', () => {
	it('normalizes inverted ranges', () => {
		expect(normalizeRange('2026-08-20', '2026-08-02')).toEqual({
			start: '2026-08-02',
			end: '2026-08-20',
		});
	});

	it('serializes and parses range values', () => {
		const range = { start: '2026-02-03', end: '2026-02-12' };
		expect(serializeIsoRange(range)).toBe('2026-02-03/2026-02-12');
		expect(parseIsoRange('2026-02-03/2026-02-12')).toEqual(range);
	});

	it('toggles multiple selection values', () => {
		expect(toggleMultipleIso(['2026-08-01'], '2026-08-15')).toEqual(['2026-08-01', '2026-08-15']);
		expect(toggleMultipleIso(['2026-08-01', '2026-08-15'], '2026-08-01')).toEqual(['2026-08-15']);
		expect(serializeMultipleIsos(parseMultipleIsos('2026-08-15,2026-08-01'))).toBe('2026-08-01,2026-08-15');
	});

	it('advances range selection from anchor to committed range', () => {
		const first = advanceRangeSelection(null, { anchor: null, hover: null }, '2026-08-05');
		expect(first.draft.anchor).toBe('2026-08-05');

		const second = advanceRangeSelection(first.committed, first.draft, '2026-08-20');
		expect(second.committed).toEqual({ start: '2026-08-05', end: '2026-08-20' });
		expect(second.draft.anchor).toBeNull();
	});

	it('marks range middle days', () => {
		const range = { start: '2026-08-05', end: '2026-08-07' };
		expect(getDaySelectionAppearance('2026-08-05', 'range', { range }).isRangeStart).toBe(true);
		expect(getDaySelectionAppearance('2026-08-06', 'range', { range }).isRangeMiddle).toBe(true);
		expect(getDaySelectionAppearance('2026-08-07', 'range', { range }).isRangeEnd).toBe(true);
		expect(getDaySelectionAppearance('2026-08-04', 'range', { range }).isSelected).toBe(false);
	});
});

describe('month utilities', () => {
	it('adds months with year rollover', () => {
		expect(addMonths(2026, 10, 2)).toEqual({ year: 2027, month: 0 });
		expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
	});

	it('builds visible month views', () => {
		expect(getVisibleMonthViews(2026, 7, 2)).toEqual([
			{ year: 2026, month: 7, offset: 0 },
			{ year: 2026, month: 8, offset: 1 },
		]);
	});
});

describe('buildCalendarMonth selection modes', () => {
	const base = { locale: 'en-US' as const };

	it('highlights a single selected day', () => {
		const weeks = buildCalendarMonth(2026, 7, { ...base, value: '2026-08-15' });
		const day = weeks.flat().find((cell) => cell.iso === '2026-08-15');
		expect(day?.isSelected).toBe(true);
	});

	it('highlights multiple selected days', () => {
		const weeks = buildCalendarMonth(2026, 7, {
			...base,
			selectionMode: 'multiple',
			value: '2026-08-05,2026-08-20',
		});
		expect(weeks.flat().find((cell) => cell.iso === '2026-08-05')?.isSelected).toBe(true);
		expect(weeks.flat().find((cell) => cell.iso === '2026-08-20')?.isSelected).toBe(true);
	});

	it('highlights range preview while drafting', () => {
		const weeks = buildCalendarMonth(2026, 7, {
			...base,
			selectionMode: 'range',
			value: '',
			rangeDraft: { anchor: '2026-08-05', hover: '2026-08-10' },
		});
		expect(weeks.flat().find((cell) => cell.iso === '2026-08-07')?.isRangeMiddle).toBe(true);
	});
});
