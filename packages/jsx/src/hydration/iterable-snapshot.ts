/**
 * Snapshots of one-shot iterators (generators), keyed by iterator identity.
 *
 * The entry remains while that iterator is reachable, including across later
 * renders. Arrays and other reusable iterables are not cached: they can be
 * walked again and their contents may change between updates.
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
 * @remarks A generator is consumed on the first call. Later calls with the same
 * iterator object return that snapshot — including count, key detection, hydrate,
 * reconcile, and later renders. JSX `children` flattening consumes the iterator
 * when the element is created and does not use this cache; produce a new iterator
 * for each `jsx()` call if those children should be yielded again.
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
