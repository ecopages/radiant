export const SWIPE_THRESHOLD_PX = 48;

export type CarouselSwipeDirection = 'prev' | 'next';

/**
 * Horizontal swipe past the threshold, ignoring mostly-vertical pointers.
 */
export function resolveSwipeDirection(
	dx: number,
	dy: number,
	threshold: number = SWIPE_THRESHOLD_PX,
): CarouselSwipeDirection | null {
	if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) {
		return null;
	}

	return dx < 0 ? 'next' : 'prev';
}

/**
 * Pointer-id swipe gesture. The host decides whether the target is excluded.
 */
export class CarouselSwipe {
	private pointerId: number | null = null;
	private startX = 0;
	private startY = 0;

	onPointerDown(event: PointerEvent, excluded: boolean): void {
		if (event.button !== 0 || excluded) {
			return;
		}

		this.pointerId = event.pointerId;
		this.startX = event.clientX;
		this.startY = event.clientY;
	}

	onPointerUp(event: PointerEvent): CarouselSwipeDirection | null {
		if (this.pointerId !== event.pointerId) {
			return null;
		}

		const dx = event.clientX - this.startX;
		const dy = event.clientY - this.startY;
		this.pointerId = null;
		return resolveSwipeDirection(dx, dy);
	}

	onPointerCancel(event: PointerEvent): void {
		if (this.pointerId === event.pointerId) {
			this.pointerId = null;
		}
	}
}
