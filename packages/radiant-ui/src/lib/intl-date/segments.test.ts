import { describe, expect, it } from 'vitest';
import { dateToIso } from './iso';
import { buildDateSegments, segmentsToDate } from './segments';

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
