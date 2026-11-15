import { describe, expect, it } from 'vitest';
import { DEFAULT_SWIPE_THRESHOLD_PX, resolveSwipeDirection } from './swipe-direction';

describe('resolveSwipeDirection', () => {
	it('reads the horizontal axis by default and ignores vertical travel', () => {
		expect(resolveSwipeDirection(-80, 10)).toBe('left');
		expect(resolveSwipeDirection(80, 10)).toBe('right');
		expect(resolveSwipeDirection(10, 200)).toBeNull();
	});

	it('reads only the vertical axis for axis y', () => {
		expect(resolveSwipeDirection(5, -80, { axis: 'y' })).toBe('up');
		expect(resolveSwipeDirection(5, 80, { axis: 'y' })).toBe('down');
		expect(resolveSwipeDirection(200, 10, { axis: 'y' })).toBeNull();
	});

	it('picks the dominant axis for axis both', () => {
		expect(resolveSwipeDirection(-90, 20, { axis: 'both' })).toBe('left');
		expect(resolveSwipeDirection(20, 90, { axis: 'both' })).toBe('down');
		expect(resolveSwipeDirection(60, 60, { axis: 'both' })).toBeNull();
	});

	it('needs travel at or past the threshold', () => {
		expect(resolveSwipeDirection(DEFAULT_SWIPE_THRESHOLD_PX - 1, 0)).toBeNull();
		expect(resolveSwipeDirection(DEFAULT_SWIPE_THRESHOLD_PX, 0)).toBe('right');
		expect(resolveSwipeDirection(20, 0, { threshold: 10 })).toBe('right');
		expect(resolveSwipeDirection(20, 0, { threshold: 30 })).toBeNull();
	});

	it('ignores mostly-cross-axis travel even past the threshold', () => {
		expect(resolveSwipeDirection(-80, 100)).toBeNull();
		expect(resolveSwipeDirection(-80, 80)).toBeNull();
	});
});
