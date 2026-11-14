import { describe, expect, it } from 'vitest';
import { DEFAULT_SWIPE_THRESHOLD_PX, MIN_FLICK_TRAVEL_PX, resolveSwipeDirection } from './swipe-direction';

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

	describe('minVelocity', () => {
		const flick = { minVelocity: 0.5 };

		it('counts a short fast flick that the threshold alone would reject', () => {
			expect(resolveSwipeDirection(-24, 2, { ...flick, elapsedMs: 40 })).toBe('left');
			expect(resolveSwipeDirection(-24, 2, { elapsedMs: 40 })).toBeNull();
		});

		it('rejects a short slow gesture and still accepts a slow long drag', () => {
			expect(resolveSwipeDirection(24, 2, { ...flick, elapsedMs: 200 })).toBeNull();
			expect(resolveSwipeDirection(80, 2, { ...flick, elapsedMs: 2000 })).toBe('right');
		});

		it('needs the minimum flick travel however fast', () => {
			expect(resolveSwipeDirection(MIN_FLICK_TRAVEL_PX - 1, 0, { ...flick, elapsedMs: 1 })).toBeNull();
			expect(resolveSwipeDirection(MIN_FLICK_TRAVEL_PX, 0, { ...flick, elapsedMs: 1 })).toBe('right');
		});

		it('measures speed along the axis, on the vertical axis too', () => {
			expect(resolveSwipeDirection(2, -24, { ...flick, axis: 'y', elapsedMs: 40 })).toBe('up');
			expect(resolveSwipeDirection(2, 24, { ...flick, axis: 'x', elapsedMs: 40 })).toBeNull();
		});
	});

	describe('dominance', () => {
		it('rejects a diagonal drag unless the axis travel is dominance times the cross travel', () => {
			expect(resolveSwipeDirection(-100, 60)).toBe('left');
			expect(resolveSwipeDirection(-100, 60, { dominance: 2 })).toBeNull();
			expect(resolveSwipeDirection(-120, 60, { dominance: 2 })).toBeNull();
			expect(resolveSwipeDirection(-121, 60, { dominance: 2 })).toBe('left');
		});

		it('applies to a flick as well', () => {
			expect(resolveSwipeDirection(30, 20, { minVelocity: 0.5, dominance: 2, elapsedMs: 20 })).toBeNull();
			expect(resolveSwipeDirection(30, 10, { minVelocity: 0.5, dominance: 2, elapsedMs: 20 })).toBe('right');
		});
	});
});
