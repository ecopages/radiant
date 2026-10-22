export type QuerySlotConfig = {
	all?: boolean;
	/** Set to `false` to query on every read. By default the result is cached until slot projection changes. */
	cache?: boolean;
	name?: string;
};

type SlotQueryHost = HTMLElement & {
	getSlotElements<T extends Element = Element>(name?: string): T[];
};

type QuerySlotResult<T> = {
	get value(): T;
};

/**
 * Creates a lazy slot query accessor bound to a host element.
 * Functional equivalent of the `@querySlot` decorator for vanilla JS usage.
 * With `all: true` the value is an array; otherwise it is the first assigned element or `null`.
 * @param host The host element to query slots within.
 *
 * @remarks
 * The type argument and `all` work as on `createQuery`.
 */
export function createQuerySlot<T extends Element = Element>(
	host: SlotQueryHost,
	options: QuerySlotConfig & { all: true },
): QuerySlotResult<T[]>;
export function createQuerySlot<T extends Element = Element>(
	host: SlotQueryHost,
	options?: QuerySlotConfig & { all?: false },
): QuerySlotResult<T | null>;
export function createQuerySlot(host: SlotQueryHost, options?: QuerySlotConfig): QuerySlotResult<Element[] | Element | null>;
export function createQuerySlot(
	host: SlotQueryHost,
	options: QuerySlotConfig = {},
): QuerySlotResult<Element[] | Element | null> {
	let cached: Element[] | Element | null = null;
	let cachedVersion: number | undefined;

	const executeQuery = (): Element[] | Element | null => {
		const elements = host.getSlotElements(options.name);
		return options.all ? elements : (elements[0] ?? null);
	};

	return {
		get value(): Element[] | Element | null {
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
