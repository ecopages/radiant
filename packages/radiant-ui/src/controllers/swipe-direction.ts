export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export type SwipeAxis = 'x' | 'y' | 'both';

export type SwipeOptions = {
	/** Which travel counts. Default: `x`. */
	axis?: SwipeAxis;
	/** Minimum travel in px along the swipe axis. Default: `DEFAULT_SWIPE_THRESHOLD_PX`. */
	threshold?: number;
};

export const DEFAULT_SWIPE_THRESHOLD_PX = 48;

/**
 * Turns pointer travel into a swipe direction, or `null` when it is not a swipe.
 *
 * @remarks
 * Pure: no DOM. A swipe needs travel of at least `threshold` along its axis that also exceeds the travel on the
 * other axis, so a mostly-cross-axis drag is ignored. With `axis: 'both'` the longer axis decides and an exact tie
 * is not a swipe.
 */
export function resolveSwipeDirection(
	dx: number,
	dy: number,
	{ axis = 'x', threshold = DEFAULT_SWIPE_THRESHOLD_PX }: SwipeOptions = {},
): SwipeDirection | null {
	const ax = Math.abs(dx);
	const ay = Math.abs(dy);
	const horizontal = axis !== 'y' && ax >= threshold && ax > ay;
	const vertical = axis !== 'x' && ay >= threshold && ay > ax;
	if (horizontal) {
		return dx < 0 ? 'left' : 'right';
	}
	if (vertical) {
		return dy < 0 ? 'up' : 'down';
	}
	return null;
}
