/**
 * Which way a sortable list runs.
 */
export type SortableAxis = 'vertical' | 'horizontal' | 'both';

/** The part of a `DOMRect` the arithmetic reads, so a test passes plain objects. */
export type SortableRect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

/**
 * The slot a dragged item takes among `rects`, an index from 0 to `rects.length`.
 *
 * @remarks
 * Pure: no DOM. `rects` are the items it would join, none of them the dragged one. `vertical` and `horizontal`
 * count the items whose midpoint the pointer has passed along the axis. `both` (wrapping layouts) takes the item
 * whose center is nearest the pointer and lands after it when the pointer is past that center in reading order
 * (right of it on the same row, otherwise below it), else before it; no items gives `0`.
 */
export function resolveInsertIndex(
	rects: readonly SortableRect[],
	point: { x: number; y: number },
	axis: SortableAxis = 'vertical',
): number {
	if (axis === 'both') {
		let slot = 0;
		let best = Infinity;
		rects.forEach((rect, index) => {
			const dx = point.x - (rect.left + rect.width / 2);
			const dy = point.y - (rect.top + rect.height / 2);
			const distance = Math.hypot(dx, dy);
			if (distance < best) {
				best = distance;
				const pastCenter = Math.abs(dy) <= rect.height / 2 ? dx > 0 : dy > 0;
				slot = pastCenter ? index + 1 : index;
			}
		});
		return slot;
	}
	const vertical = axis === 'vertical';
	return rects.filter((rect) =>
		vertical ? point.y > rect.top + rect.height / 2 : point.x > rect.left + rect.width / 2,
	).length;
}

/**
 * The final index of a dragged item moving within its own list, from where the pointer is over the item rects.
 *
 * @remarks
 * Pure. `rects` are every item in current order, the dragged one included (its rect is ignored, because an owner
 * that translates it with the pointer would otherwise always find it nearest). The owner applies the new order
 * only on drop, so the other rects stay put during the drag. The result is an index in the reordered list, the
 * slot `resolveInsertIndex` finds among the other items.
 */
export function resolveSortIndex(
	rects: readonly SortableRect[],
	from: number,
	point: { x: number; y: number },
	axis: SortableAxis = 'vertical',
): number {
	return resolveInsertIndex(
		rects.filter((_, index) => index !== from),
		point,
		axis,
	);
}

/** The index of the first rect that contains `point`, or `-1`. Used to find the list under the pointer. */
export function findRectIndex(rects: readonly SortableRect[], point: { x: number; y: number }): number {
	return rects.findIndex(
		(rect) =>
			point.x >= rect.left &&
			point.x <= rect.left + rect.width &&
			point.y >= rect.top &&
			point.y <= rect.top + rect.height,
	);
}

/**
 * The container a key moves a lifted item to, or `null` when the key does not switch container.
 *
 * @remarks Pure. `PageDown` goes to the next container and `PageUp` to the previous, clamped, by position in the group.
 */
export function resolveContainerKeyIndex(key: string, current: number, count: number): number | null {
	if (key === 'PageDown') {
		return Math.min(current + 1, count - 1);
	}
	return key === 'PageUp' ? Math.max(current - 1, 0) : null;
}

/**
 * Where a key moves a lifted item, or `null` when the key does not move it.
 *
 * @remarks
 * Pure. `vertical` reads ArrowUp and ArrowDown, `horizontal` ArrowLeft and ArrowRight, `both` all four (Up and
 * Left move back, Down and Right move forward). Home and End jump to the ends. The index is clamped, never
 * wrapped, so a move past an end returns the end index and the owner can tell nothing moved by comparing. A
 * right-to-left owner swaps `ArrowLeft` and `ArrowRight` before calling.
 */
export function resolveSortKeyIndex(
	key: string,
	current: number,
	count: number,
	axis: SortableAxis = 'vertical',
): number | null {
	const last = count - 1;
	const vertical = axis !== 'horizontal';
	const horizontal = axis !== 'vertical';
	if (key === 'Home') {
		return 0;
	}
	if (key === 'End') {
		return last;
	}
	if ((vertical && key === 'ArrowUp') || (horizontal && key === 'ArrowLeft')) {
		return Math.max(current - 1, 0);
	}
	if ((vertical && key === 'ArrowDown') || (horizontal && key === 'ArrowRight')) {
		return Math.min(current + 1, last);
	}
	return null;
}

/**
 * A copy of `items` with the one at `from` moved to `to`.
 *
 * @remarks
 * What an owner calls with the `from` and `to` of a change to compute the new order.
 *
 * @example
 * ```ts
 * reorder(['a', 'b', 'c'], 0, 2); // ['b', 'c', 'a']
 * ```
 */
export function reorder<T>(items: readonly T[], from: number, to: number): T[] {
	const next = [...items];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	return next;
}
