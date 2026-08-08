import { describe, expect, test } from 'vitest';
import { collapsedStackHeight, collapsedToastOpacity, expandedStackHeight, expandedToastOffset } from './stack-layout';

describe('expandedToastOffset', () => {
	test('front toast stays at 0', () => {
		expect(expandedToastOffset(0, [40, 80, 120], 14)).toBe(0);
	});

	test('offsets by prior natural heights plus gaps when heights differ', () => {
		const heights = [40, 100, 60];
		const gap = 14;

		expect(expandedToastOffset(1, heights, gap)).toBe(40 + 14);
		expect(expandedToastOffset(2, heights, gap)).toBe(40 + 14 + 100 + 14);
	});

	test('does not use a uniform index*gap when heights differ', () => {
		const heights = [40, 120];
		const gap = 14;
		const uniform = 1 * gap;
		const mixed = expandedToastOffset(1, heights, gap);

		expect(mixed).toBe(54);
		expect(mixed).not.toBe(uniform);
	});
});

describe('expandedStackHeight', () => {
	test('sums heights and gaps between toasts', () => {
		expect(expandedStackHeight([40, 100, 60], 14)).toBe(40 + 100 + 60 + 14 * 2);
	});

	test('handles a single toast', () => {
		expect(expandedStackHeight([72], 14)).toBe(72);
	});
});

describe('collapsedStackHeight', () => {
	test('uses front height plus gap peeks for visible count only', () => {
		expect(collapsedStackHeight(80, 3, 14)).toBe(80 + 28);
		expect(collapsedStackHeight(80, 1, 14)).toBe(80);
	});
});

describe('collapsedToastOpacity', () => {
	test('front is fully opaque and behind toasts fade', () => {
		expect(collapsedToastOpacity(0)).toBe(1);
		expect(collapsedToastOpacity(1)).toBe(0.8);
		expect(collapsedToastOpacity(2)).toBe(0.6);
		expect(collapsedToastOpacity(3)).toBe(0.4);
	});

	test('does not fall below the floor', () => {
		expect(collapsedToastOpacity(10)).toBe(0.4);
	});
});
