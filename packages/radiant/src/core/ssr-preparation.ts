type SsrPreparationCallback = () => void;

const SSR_PREPARATION_CALLBACKS = Symbol.for('@ecopages/radiant.ssr-preparation-callbacks');

type SsrCallbackLists = [SsrPreparationCallback[], SsrPreparationCallback[]];

/**
 * Registers instance-local SSR preparation work that should run immediately
 * before a Radiant host serializes its first server render.
 *
 * Decorators use this to defer SSR-only setup until after class fields,
 * reactive props, and authored host content have all been applied.
 *
 * @remarks Pass `beforeOnUpdated` for context bootstrap that must run before
 * `prepareForSsr` flushes `@onUpdated` callbacks from construction.
 */
export function registerSsrPreparationCallback(
	host: object,
	callback: SsrPreparationCallback,
	beforeOnUpdated = false,
): void {
	const lists = getCallbackLists(host) ?? createCallbackLists(host);
	lists[beforeOnUpdated ? 0 : 1].push(callback);
}

/**
 * Runs registered SSR preparation callbacks for the provided host.
 *
 * The callbacks are intentionally retained so repeated SSR serializations stay
 * deterministic after later host mutations.
 *
 * @remarks `beforeOnUpdated` runs context bootstrap. The default list runs after
 * that first `@onUpdated` flush.
 */
export function runSsrPreparationCallbacks(host: object, beforeOnUpdated = false): void {
	const lists = getCallbackLists(host);

	if (!lists) {
		return;
	}

	for (const callback of lists[beforeOnUpdated ? 0 : 1]) {
		callback();
	}
}

function getCallbackLists(host: object): SsrCallbackLists | undefined {
	const lists = (host as Record<PropertyKey, unknown>)[SSR_PREPARATION_CALLBACKS];

	if (Array.isArray(lists) && Array.isArray(lists[0])) {
		return lists as SsrCallbackLists;
	}
}

function createCallbackLists(host: object): SsrCallbackLists {
	const lists: SsrCallbackLists = [[], []];
	Object.defineProperty(host, SSR_PREPARATION_CALLBACKS, {
		value: lists,
		configurable: true,
	});
	return lists;
}
