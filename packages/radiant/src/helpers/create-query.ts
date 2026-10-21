import { resolveHostElement } from './resolve-host-element';

type BaseQueryConfig = {
	all?: boolean;
	cache?: boolean;
};

type QueryBySelector = { selector: string };

type QueryByRef = { ref: string };

export type QueryHostTarget = Element | { host: Element };

export type QueryConfig = BaseQueryConfig & (QueryBySelector | QueryByRef);

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
 * Creates a lazy DOM query accessor bound to an element host or controller.
 * Functional equivalent of the `@query` decorator for vanilla JS usage.
 * With `all: true` the value is an array; otherwise it is the first match or `null`.
 * @param target The element host or controller to query within.
 * @param options {@link QueryConfig} The query configuration.
 */
export function createQuery<T extends Element = Element>(
	target: QueryHostTarget,
	options: QueryConfig & { all: true },
): QueryResult<T[]>;
export function createQuery<T extends Element = Element>(
	target: QueryHostTarget,
	options: QueryConfig & { all?: false },
): QueryResult<T | null>;
export function createQuery(target: QueryHostTarget, options: QueryConfig): QueryResult<Element[] | Element | null>;
export function createQuery(target: QueryHostTarget, options: QueryConfig): QueryResult<Element[] | Element | null> {
	const host = resolveQueryHost(target);
	const selector = 'selector' in options ? options.selector : `[data-ref="${options.ref}"]`;
	let cached: Element[] | Element | null = null;

	const executeQuery = (): Element[] | Element | null => {
		if (options.all) {
			return Array.from(host.querySelectorAll(selector));
		}

		return host.querySelector(selector);
	};

	return {
		get value(): Element[] | Element | null {
			if (options.cache) {
				if (cached === null || (options.all && Array.isArray(cached) && !cached.length)) {
					cached = executeQuery();
				}
				return cached;
			}
			return executeQuery();
		},
	};
}
