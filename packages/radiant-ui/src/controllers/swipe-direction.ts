/**
 * The direction of travel of a swipe.
 */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Which axes count for a swipe.
 */
export type SwipeAxis = 'x' | 'y' | 'both';

/**
 * What a swipe needs: the axis, the distance, and optionally a speed and how clearly it follows the axis.
 */
export type SwipeOptions = {
	/** Which travel counts. Default: `x`. */
	axis?: SwipeAxis;
	/** Minimum travel in px along the swipe axis. Default: `DEFAULT_SWIPE_THRESHOLD_PX`. */
	threshold?: number;
	/**
	 * Speed in px per ms along the swipe axis that lets a shorter travel count: a flick. The travel must still reach
	 * `MIN_FLICK_TRAVEL_PX`. Default: none, so only `threshold` decides.
	 */
	minVelocity?: number;
	/** How many times larger the travel along the axis must be than across it. Default: `1`, which is simply larger. */
	dominance?: number;
};

/**
 * `SwipeOptions` plus the time a gesture took, which only `minVelocity` reads.
 */
export type SwipeDecisionOptions = SwipeOptions & {
	/** Milliseconds from the press to the release. */
	elapsedMs?: number;
};

/**
 * The travel, in pixels, a swipe needs by default.
 */
export const DEFAULT_SWIPE_THRESHOLD_PX = 48;

/**
 * The least travel, in pixels, a fast gesture needs to count as a flick, so a twitch of the finger is not one.
 */
export const MIN_FLICK_TRAVEL_PX = 16;

/**
 * Turns pointer travel into a swipe direction, or `null` when it is not a swipe.
 *
 * @remarks
 * Pure: no DOM. A swipe needs travel along its axis that is larger than `dominance` times the travel on the other
 * axis, so a mostly-cross-axis drag is ignored, and that is either at least `threshold`, or, when `minVelocity` is
 * set, at least `MIN_FLICK_TRAVEL_PX` covered within `elapsedMs` fast enough. With `axis: 'both'` the dominant axis
 * decides and an exact tie is not a swipe. Without `minVelocity`, `elapsedMs` is not read.
 *
 * @example
 * ```ts
 * resolveSwipeDirection(-60, 5); // 'left'
 * resolveSwipeDirection(10, 5); // null
 * resolveSwipeDirection(-24, 2, { minVelocity: 0.5, elapsedMs: 40 }); // 'left', a flick
 * ```
 */
export function resolveSwipeDirection(
	dx: number,
	dy: number,
	{
		axis = 'x',
		threshold = DEFAULT_SWIPE_THRESHOLD_PX,
		minVelocity,
		dominance = 1,
		elapsedMs = 0,
	}: SwipeDecisionOptions = {},
): SwipeDirection | null {
	const ax = Math.abs(dx);
	const ay = Math.abs(dy);
	const travels = (along: number, across: number): boolean =>
		along > across * dominance &&
		(along >= threshold ||
			(minVelocity !== undefined && along >= MIN_FLICK_TRAVEL_PX && along >= minVelocity * elapsedMs));
	if (axis !== 'y' && travels(ax, ay)) {
		return dx < 0 ? 'left' : 'right';
	}
	if (axis !== 'x' && travels(ay, ax)) {
		return dy < 0 ? 'up' : 'down';
	}
	return null;
}
