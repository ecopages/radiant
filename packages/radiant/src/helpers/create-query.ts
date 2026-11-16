import { resolveHostElement } from './resolve-host-element';

export type QueryHostTarget = Element | { host: Element };

type QueryResult<T> = {
	get value(): T;
};

/**
 * Resolves the DOM element that should serve as the query root.
 *
 * `@query(...)` can run on both element hosts and controller instances. This
 * helper normalizes those call sites to the underlying element that actually
 * owns the DOM subtree.
 */
export function resolveQueryHost(target: QueryHostTarget): Element {
	return resolveHostElement(target);
}

/**
 * Creates a live accessor for the first element matching `selector` inside an element host or controller,
 * or `null`. Functional equivalent of the `@query` decorator for vanilla JS usage.
 *
 * @remarks
 * Unscoped: a match inside a nested host is found. The lookup repeats on every read, with no cache. For
 * the parts a host owns, use `getRef`.
 */
export function createQuery<T extends Element = Element>(
	target: QueryHostTarget,
	selector: string,
): QueryResult<T | null> {
	const host = resolveQueryHost(target);

	return {
		get value(): T | null {
			return host.querySelector<T>(selector);
		},
	};
}

/**
 * Creates a live accessor for every element matching `selector` inside an element host or controller,
 * in document order. Functional equivalent of the `@queryAll` decorator, and the all-matches counterpart of
 * {@link createQuery}.
 *
 * @remarks
 * Unscoped: matches inside nested hosts are included. The array is rebuilt on every read.
 */
export function createQueryAll<T extends Element = Element>(
	target: QueryHostTarget,
	selector: string,
): QueryResult<T[]> {
	const host = resolveQueryHost(target);

	return {
		get value(): T[] {
			return Array.from(host.querySelectorAll<T>(selector));
		},
	};
}
