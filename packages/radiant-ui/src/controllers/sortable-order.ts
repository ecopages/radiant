export type SortableAxis = 'vertical' | 'horizontal' | 'both';

/** The part of a `DOMRect` the arithmetic reads, so a test passes plain objects. */
export type SortableRect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

/**
 * The final index of a dragged item, from where the pointer is over the item rects.
 *
 * @remarks
 * Pure: no DOM. `rects` are the rects of every item in current order, the dragged one included, and are expected
 * to be static during the drag because the owner applies the new order only on drop. `vertical` and `horizontal`
 * count the other items whose midpoint the pointer has passed along the axis; that count is the index the dragged
 * item takes once moved, so the result is an index in the reordered list. `both` (wrapping layouts) picks the item
 * whose center is nearest to the pointer and takes its index.
 */
export function resolveSortIndex(
	rects: readonly SortableRect[],
	from: number,
	point: { x: number; y: number },
	axis: SortableAxis = 'vertical',
): number {
	if (axis === 'both') {
		let nearest = from;
		let best = Infinity;
		rects.forEach((rect, index) => {
			const distance = Math.hypot(point.x - (rect.left + rect.width / 2), point.y - (rect.top + rect.height / 2));
			if (distance < best) {
				best = distance;
				nearest = index;
			}
		});
		return nearest;
	}
	let passed = 0;
	rects.forEach((rect, index) => {
		if (index === from) {
			return;
		}
		const midpoint = axis === 'vertical' ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
		if ((axis === 'vertical' ? point.y : point.x) > midpoint) {
			passed += 1;
		}
	});
	return passed;
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
 */
export function reorder<T>(items: readonly T[], from: number, to: number): T[] {
	const next = [...items];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	return next;
}
