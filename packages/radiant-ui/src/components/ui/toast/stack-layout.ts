/**
 * Expanded-stack Y offset for toast at `index` (0 = front).
 *
 * @remarks
 * Matches Sonner: sum of natural heights before this toast, plus `index * gap`.
 * Using a uniform `index * gap` alone breaks when toast heights differ.
 */
export function expandedToastOffset(index: number, heights: readonly number[], gap: number): number {
	let heightBefore = 0;
	for (let i = 0; i < index; i += 1) {
		heightBefore += heights[i] ?? 0;
	}
	return heightBefore + index * gap;
}

/** Total stack height when expanded: all toast heights + gaps between them. */
export function expandedStackHeight(heights: readonly number[], gap: number): number {
	if (heights.length === 0) return 0;
	const totalHeights = heights.reduce((sum, height) => sum + height, 0);
	return totalHeights + Math.max(0, heights.length - 1) * gap;
}

/**
 * Collapsed peek stack height: front toast + gap peek per visible stacked toast.
 *
 * @remarks
 * `peekCount` is how many toasts are visually revealed (including the front),
 * not the full mounted count — overflow stays hidden until expand.
 */
export function collapsedStackHeight(frontHeight: number, peekCount: number, gap: number): number {
	if (peekCount <= 0) return 0;
	return frontHeight + Math.max(0, peekCount - 1) * gap;
}
