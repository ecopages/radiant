/**
 * Snapshots of one-shot iterators (generators) so count, key detection, hydrate,
 * and reconcile can all read the same children.
 *
 * Arrays and other reusable iterables are not cached: they can be walked again
 * and their contents may change between updates.
 */
const ONE_SHOT_ITERABLE_SNAPSHOTS = new WeakMap<object, unknown[]>();

/**
 * Returns whether `value` is its own iterator, so `Array.from` can run only once.
 *
 * Generator objects qualify. Arrays, Sets, and Maps return a fresh iterator and
 * must not be cached.
 */
function isOneShotIterable(value: Iterable<unknown>): boolean {
	const iterator = value as Iterable<unknown> & Partial<Iterator<unknown>>;

	return typeof iterator.next === 'function' && iterator[Symbol.iterator]() === iterator;
}

/**
 * Materialises iterable children, reusing arrays and snapshotting one-shot iterators.
 *
 * @remarks A generator is consumed on the first call. Later calls in the same
 * hydrate or update pass return that snapshot so `countHydrationMarkers`,
 * `countHydratedRangeNodes`, and reconciliation do not see an empty iterator.
 */
export function materializeIterableChildren(value: Iterable<unknown>): unknown[] {
	if (Array.isArray(value)) {
		return value;
	}

	if (!isOneShotIterable(value)) {
		return Array.from(value);
	}

	const cached = ONE_SHOT_ITERABLE_SNAPSHOTS.get(value);

	if (cached) {
		return cached;
	}

	const children = Array.from(value);
	ONE_SHOT_ITERABLE_SNAPSHOTS.set(value, children);
	return children;
}
