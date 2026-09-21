import { describe, expect, it } from 'vitest';
import {
	applyBackspaceToSegment,
	applyDigitToSegment,
	clearSegmentValue,
	firstEmptyOrFirstPart,
	getSegmentBounds,
	incrementSegmentValue,
} from './segment-editing';
import { buildDateSegments, segmentsToDate } from './segments';

describe('applyDigitToSegment', () => {
	it('auto-advances when month is complete', () => {
		let segments = buildDateSegments(null, 'en-US');
		let entered = '';
		({ segments, enteredKeys: entered } = applyDigitToSegment(segments, 'month', '0', entered));
		expect(entered).toBe('0');
		const result = applyDigitToSegment(segments, 'month', '8', entered);
		expect(result.focusNext).toBe(true);
		expect(result.segments.find((segment) => segment.type === 'month')?.value).toBe('08');
	});

	it('keeps a single in-progress digit until the unit is complete', () => {
		const segments = buildDateSegments(null, 'en-US');
		const result = applyDigitToSegment(segments, 'day', '3', '');
		expect(result.segments.find((segment) => segment.type === 'day')?.value).toBe('3');
		expect(result.focusNext).toBe(false);
	});
});

describe('incrementSegmentValue', () => {
	it('wraps month at bounds', () => {
		const segments = buildDateSegments(new Date(2026, 11, 1), 'en-US');
		const next = incrementSegmentValue(segments, 'month', 1);
		expect(next.find((segment) => segment.type === 'month')?.value).toBe('01');
	});
});

describe('applyBackspaceToSegment', () => {
	it('trims the last digit from a multi-digit segment', () => {
		const segments = buildDateSegments(new Date(2026, 7, 2), 'en-US');
		const result = applyBackspaceToSegment(segments, 'day');
		expect(result.kind).toBe('updated');
		if (result.kind === 'updated') {
			expect(result.segments.find((segment) => segment.type === 'day')?.value).toBe('0');
			expect(result.enteredKeys).toBe('0');
		}
	});
});

describe('firstEmptyOrFirstPart', () => {
	it('returns the first empty editable part in one pass', () => {
		const segments = buildDateSegments(null, 'en-US');
		expect(firstEmptyOrFirstPart(segments)).toBe('month');
	});
});

describe('getSegmentBounds', () => {
	it('caps day segments using year and month', () => {
		const segments = buildDateSegments(new Date(2026, 1, 1), 'en-US');
		expect(getSegmentBounds('day', segments).max).toBe(28);
	});
});

describe('clearSegmentValue', () => {
	it('clears a filled segment', () => {
		const segments = buildDateSegments(new Date(2026, 7, 2), 'en-US');
		const cleared = clearSegmentValue(segments, 'day');
		expect(cleared.find((segment) => segment.type === 'day')?.isPlaceholder).toBe(true);
		expect(segmentsToDate(cleared)).toBeNull();
	});
});
