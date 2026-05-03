export type QuerySlotConfig = {
	all?: boolean;
	cache?: boolean;
	name?: string;
};

type SlotQueryHost = HTMLElement & {
	getSlotElement<T extends Element = Element>(name?: string): T | null;
	getSlotElements<T extends Element = Element>(name?: string): T[];
};

type QuerySlotResult<T extends Element | Element[] | null> = {
	get value(): T | null;
};

/**
 * Creates a lazy slot query accessor bound to a host element.
 * Functional equivalent of the `@querySlot` decorator for vanilla JS usage.
 * @param host The host element to query slots within.
 * @param options {@link QuerySlotConfig} The slot query configuration.
 */
export function createQuerySlot<T extends Element | Element[] | null = Element | null>(
	host: SlotQueryHost,
	options: QuerySlotConfig = {},
): QuerySlotResult<T> {
	let cached: T | null = null;
	let cachedVersion: number | undefined;

	const executeQuery = (): T | null => {
		if (options.all) {
			return (typeof host.getSlotElements === 'function' ? host.getSlotElements(options.name) : []) as T;
		}
		return (typeof host.getSlotElement === 'function' ? host.getSlotElement(options.name) : null) as T | null;
	};

	return {
		get value(): T | null {
			if (options.cache === false) {
				return executeQuery();
			}

			const currentVersion = (host as unknown as Record<string, number | undefined>).slotProjectionVersion ?? 0;

			if (cachedVersion !== currentVersion) {
				cached = executeQuery();
				cachedVersion = currentVersion;
			}

			return cached;
		},
	};
}
