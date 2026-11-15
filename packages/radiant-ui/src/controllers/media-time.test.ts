import { describe, expect, it } from 'vitest';
import { bufferedEnd, clampSeek, formatMediaTime, type TimeRangesLike } from './media-time';

function ranges(...pairs: Array<[number, number]>): TimeRangesLike {
	return { length: pairs.length, start: (i) => pairs[i]![0], end: (i) => pairs[i]![1] };
}

describe('formatMediaTime', () => {
	it('formats minutes and seconds, flooring fractions', () => {
		expect(formatMediaTime(0)).toBe('0:00');
		expect(formatMediaTime(5.9)).toBe('0:05');
		expect(formatMediaTime(75)).toBe('1:15');
		expect(formatMediaTime(599)).toBe('9:59');
		expect(formatMediaTime(3599.9)).toBe('59:59');
	});

	it('shows hours from one hour on by default', () => {
		expect(formatMediaTime(3600)).toBe('1:00:00');
		expect(formatMediaTime(3725)).toBe('1:02:05');
		expect(formatMediaTime(36000)).toBe('10:00:00');
	});

	it('always shows hours with hours: true and never with hours: false', () => {
		expect(formatMediaTime(75, { hours: true })).toBe('0:01:15');
		expect(formatMediaTime(3725, { hours: false })).toBe('62:05');
		expect(formatMediaTime(75, { hours: 'auto' })).toBe('1:15');
	});

	it('formats NaN, Infinity and negative values as zero', () => {
		expect(formatMediaTime(Number.NaN)).toBe('0:00');
		expect(formatMediaTime(Number.POSITIVE_INFINITY)).toBe('0:00');
		expect(formatMediaTime(Number.NEGATIVE_INFINITY)).toBe('0:00');
		expect(formatMediaTime(-12)).toBe('0:00');
		expect(formatMediaTime(Number.NaN, { hours: true })).toBe('0:00:00');
	});
});

describe('clampSeek', () => {
	it('clamps into [0, duration]', () => {
		expect(clampSeek(-3, 60)).toBe(0);
		expect(clampSeek(30, 60)).toBe(30);
		expect(clampSeek(90, 60)).toBe(60);
		expect(clampSeek(60, 60)).toBe(60);
	});

	it('clamps at 0 only when the duration is unknown or live', () => {
		expect(clampSeek(-3, Number.NaN)).toBe(0);
		expect(clampSeek(90, Number.NaN)).toBe(90);
		expect(clampSeek(90, Number.POSITIVE_INFINITY)).toBe(90);
	});

	it('never returns a non-finite value', () => {
		expect(clampSeek(Number.NaN, 60)).toBe(0);
		expect(clampSeek(Number.NaN, Number.NaN)).toBe(0);
		expect(clampSeek(Number.POSITIVE_INFINITY, 60)).toBe(60);
		expect(clampSeek(Number.POSITIVE_INFINITY, Number.NaN)).toBe(0);
		expect(clampSeek(Number.NEGATIVE_INFINITY, 60)).toBe(0);
	});
});

describe('bufferedEnd', () => {
	it('returns the end of the range containing the position', () => {
		const buffered = ranges([0, 10], [30, 50]);
		expect(bufferedEnd(buffered, 5)).toBe(10);
		expect(bufferedEnd(buffered, 30)).toBe(50);
		expect(bufferedEnd(buffered, 49.5)).toBe(50);
	});

	it('includes both edges of a range', () => {
		const buffered = ranges([0, 10], [30, 50]);
		expect(bufferedEnd(buffered, 0)).toBe(10);
		expect(bufferedEnd(buffered, 10)).toBe(10);
	});

	it('returns 0 in a gap, outside every range and with no ranges', () => {
		const buffered = ranges([0, 10], [30, 50]);
		expect(bufferedEnd(buffered, 20)).toBe(0);
		expect(bufferedEnd(buffered, 51)).toBe(0);
		expect(bufferedEnd(buffered, -1)).toBe(0);
		expect(bufferedEnd(ranges(), 5)).toBe(0);
	});
});
