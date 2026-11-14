/**
 * Wraps an active option index in the collection bounds.
 *
 * @example
 * ```ts
 * wrapCollectionIndex(2, 1, 3); // 0
 * ```
 */
export function wrapCollectionIndex(index: number, direction: 1 | -1, length: number): number {
	if (length === 0) {
		return -1;
	}
	if (direction === 1) {
		return index >= length - 1 ? 0 : index + 1;
	}
	return index <= 0 ? length - 1 : index - 1;
}
