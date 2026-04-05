type BaseQueryConfig = {
	all?: boolean;
	cache?: boolean;
	scope?: QueryScope;
};

type QueryBySelector = { selector: string };

type QueryByRef = { ref: string };

/**
 * Selects which DOM tree a query should read from.
 */
export type QueryScope = 'light' | 'shadow' | 'both';

export type QueryConfig = BaseQueryConfig & (QueryBySelector | QueryByRef);

type QueryRoot = Element | ShadowRoot;

type QueryResult<T extends Element | Element[]> = {
	get value(): T | null;
};

function getQueryRoots(host: HTMLElement, scope: QueryScope = 'light'): QueryRoot[] {
	if (scope === 'shadow') {
		return host.shadowRoot ? [host.shadowRoot] : [];
	}

	if (scope === 'both') {
		return host.shadowRoot ? [host, host.shadowRoot] : [host];
	}

	return [host];
}

/**
 * Creates a lazy DOM query accessor bound to a host element.
 * Functional equivalent of the `@query` decorator for vanilla JS usage.
 * @param host The host element to query within.
 * @param options {@link QueryConfig} The query configuration.
 */
export function createQuery<T extends Element | Element[] = Element>(
	host: HTMLElement,
	options: QueryConfig,
): QueryResult<T> {
	const selector = 'selector' in options ? options.selector : `[data-ref="${options.ref}"]`;
	let cached: T | null = null;

	const executeQuery = (): T | null => {
		const roots = getQueryRoots(host, options.scope);

		if (options?.all) {
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
			if (options?.cache) {
				if (cached === null || (options?.all && Array.isArray(cached) && !cached.length)) {
					cached = executeQuery();
				}
				return cached;
			}
			return executeQuery();
		},
	};
}
