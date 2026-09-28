import { describe, expect, it } from 'vitest';
import { dateToIso } from './iso';
import { buildDateSegments, draftStatus, segmentsToDate } from './segments';

describe('buildDateSegments', () => {
	it('orders segments for en-US as month/day/year', () => {
		const segments = buildDateSegments(new Date(2026, 7, 2), 'en-US');
		const editable = segments.filter((segment) => segment.editable).map((segment) => segment.type);
		expect(editable).toEqual(['month', 'day', 'year']);
	});

	it('shows placeholders when value is empty', () => {
		const segments = buildDateSegments(null, 'en-US');
		const month = segments.find((segment) => segment.type === 'month');
		expect(month?.isPlaceholder).toBe(true);
		expect(month?.placeholder.length).toBeGreaterThan(0);
	});
});

describe('segmentsToDate', () => {
	it('builds a date from filled segments', () => {
		const segments = buildDateSegments(null, 'en-US').map((segment) => {
			if (segment.type === 'month') {
				return { ...segment, value: '08', isPlaceholder: false };
			}
			if (segment.type === 'day') {
				return { ...segment, value: '02', isPlaceholder: false };
			}
			if (segment.type === 'year') {
				return { ...segment, value: '2026', isPlaceholder: false };
			}
			return segment;
		});

		expect(dateToIso(segmentsToDate(segments)!)).toBe('2026-08-02');
	});
});

describe('draftStatus', () => {
	const draft = (parts: { month?: string; day?: string; year?: string }) =>
		buildDateSegments(null, 'en-US').map((segment) => {
			const value = parts[segment.type as keyof typeof parts];
			return value == null ? segment : { ...segment, value, isPlaceholder: false };
		});

	it('reports a year with fewer than four digits before anything else', () => {
		expect(draftStatus(draft({ year: '1' }))).toEqual({ kind: 'partial-year' });
		expect(draftStatus(draft({ month: '08', day: '20', year: '26' }))).toEqual({ kind: 'partial-year' });
	});

	it('reports an all-empty draft', () => {
		expect(draftStatus(draft({}))).toEqual({ kind: 'empty' });
	});

	it('reports a missing unit or an impossible date as incomplete', () => {
		expect(draftStatus(draft({ month: '08', year: '2026' }))).toEqual({ kind: 'incomplete' });
		expect(draftStatus(draft({ month: '02', day: '30', year: '2026' }))).toEqual({ kind: 'incomplete' });
	});

	it('checks min and max inclusively', () => {
		const segments = draft({ month: '08', day: '20', year: '2026' });
		expect(draftStatus(segments, { min: '2026-08-21' })).toEqual({ kind: 'out-of-range' });
		expect(draftStatus(segments, { max: '2026-08-19' })).toEqual({ kind: 'out-of-range' });
		expect(draftStatus(segments, { min: '2026-08-20', max: '2026-08-20' })).toEqual({
			kind: 'date',
			iso: '2026-08-20',
		});
	});

	it('returns the ISO date for a complete draft', () => {
		expect(draftStatus(draft({ month: '8', day: '5', year: '2026' }))).toEqual({ kind: 'date', iso: '2026-08-05' });
	});
});
