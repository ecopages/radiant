type BaseQueryConfig = {
	all?: boolean;
	cache?: boolean;
	scope?: QueryScope;
};

type QueryBySelector = { selector: string };

type QueryByRef = { ref: string };

export type QueryHostTarget = Element | { host: Element };

/**
 * Selects which DOM tree a query should read from.
 */
export type QueryScope = 'light' | 'shadow' | 'both';

export type QueryConfig = BaseQueryConfig & (QueryBySelector | QueryByRef);

type QueryRoot = Element | ShadowRoot;

type QueryResult<T extends Element | Element[]> = {
	get value(): T | null;
};

function resolveShadowRoot(host: Element): ShadowRoot | null {
	return 'shadowRoot' in host ? ((host as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot ?? null) : null;
}

/**
 * Resolves the DOM element that should serve as the query root.
 *
 * `@query(...)` can run on both element hosts and controller instances. This
 * helper normalizes those call sites to the underlying element that actually
 * owns the DOM subtree.
 */
export function resolveQueryHost(target: QueryHostTarget): Element {
	return target instanceof Element ? target : target.host;
}

function getQueryRoots(host: Element, scope: QueryScope = 'light'): QueryRoot[] {
	const shadowRoot = resolveShadowRoot(host);

	if (scope === 'shadow') {
		return shadowRoot ? [shadowRoot] : [];
	}

	if (scope === 'both') {
		return shadowRoot ? [host, shadowRoot] : [host];
	}

	return [host];
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
		const roots = getQueryRoots(host, options.scope);

		if (options.all) {
			return roots.flatMap((root) => Array.from(root.querySelectorAll(selector))) as T;
		}

		for (const root of roots) {
			const match = root.querySelector(selector);
			if (match) {
				return match as T;
			}
		}

		return null;
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
