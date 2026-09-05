import { describe, expect, it } from 'vitest';
import { CarouselSwipe, resolveSwipeDirection, SWIPE_THRESHOLD_PX } from './carousel-swipe';

describe('resolveSwipeDirection', () => {
	it('ignores short or mostly-vertical pointers', () => {
		expect(resolveSwipeDirection(SWIPE_THRESHOLD_PX - 1, 0)).toBeNull();
		expect(resolveSwipeDirection(-80, 100)).toBeNull();
	});

	it('maps horizontal travel past the threshold', () => {
		expect(resolveSwipeDirection(-80, 10)).toBe('next');
		expect(resolveSwipeDirection(80, 10)).toBe('prev');
	});
});

describe('CarouselSwipe', () => {
	it('returns a direction only for the tracked pointer', () => {
		const swipe = new CarouselSwipe();
		swipe.onPointerDown({ button: 0, pointerId: 1, clientX: 200, clientY: 80 } as PointerEvent, false);

		expect(
			swipe.onPointerUp({ pointerId: 2, clientX: 60, clientY: 80 } as PointerEvent),
		).toBeNull();
		expect(
			swipe.onPointerUp({ pointerId: 1, clientX: 60, clientY: 80 } as PointerEvent),
		).toBe('next');
	});

	it('ignores excluded targets', () => {
		const swipe = new CarouselSwipe();
		swipe.onPointerDown({ button: 0, pointerId: 1, clientX: 200, clientY: 80 } as PointerEvent, true);

		expect(
			swipe.onPointerUp({ pointerId: 1, clientX: 60, clientY: 80 } as PointerEvent),
		).toBeNull();
	});
});
