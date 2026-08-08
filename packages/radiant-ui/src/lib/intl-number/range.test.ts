import { describe, expect, test } from 'vitest';
import { snapToStep } from './range';

describe('snapToStep', () => {
	test('snaps within a finite range', () => {
		expect(snapToStep(4.6, 0, 10, 1)).toBe(5);
		expect(snapToStep(-1, 0, 10, 1)).toBe(0);
		expect(snapToStep(12, 0, 10, 1)).toBe(10);
	});

	test('uses 0 as step origin when min is -Infinity', () => {
		expect(snapToStep(4001, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, 1)).toBe(4001);
		expect(snapToStep(1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, 1)).toBe(1);
	});

	test('does not produce NaN for unbounded NumberField defaults', () => {
		const next = snapToStep(3 + 1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, 1);
		expect(Number.isFinite(next)).toBe(true);
		expect(next).toBe(4);
	});
});
