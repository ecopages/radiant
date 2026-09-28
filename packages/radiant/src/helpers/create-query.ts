import { resolveHostElement } from './resolve-host-element';

type BaseQueryConfig = {
	all?: boolean;
	cache?: boolean;
};

type QueryBySelector = { selector: string };

type QueryByRef = { ref: string };

export type QueryHostTarget = Element | { host: Element };

export type QueryConfig = BaseQueryConfig & (QueryBySelector | QueryByRef);

type QueryResult<T extends Element | Element[]> = {
	get value(): T | null;
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
 * @param target The element host or controller to query within.
 * @param options {@link QueryConfig} The query configuration.
 */
export function createQuery<T extends Element | Element[] = Element>(
	target: QueryHostTarget,
	options: QueryConfig,
): QueryResult<T> {
	const host = resolveQueryHost(target);
	const selector = 'selector' in options ? options.selector : `[data-ref="${options.ref}"]`;
	let cached: T | null = null;

	const executeQuery = (): T | null => {
		if (options.all) {
			return Array.from(host.querySelectorAll(selector)) as T;
		}

		return host.querySelector(selector) as T | null;
	};

	return {
		get value(): T | null {
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
