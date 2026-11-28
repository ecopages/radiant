type SsrPreparationCallback = () => void;
type SsrPreparationPhase = boolean | 'beforeAuthoredChildren';

const SSR_PREPARATION_CALLBACKS = Symbol.for('@ecopages/radiant.ssr-preparation-callbacks');

type SsrCallbackLists = Record<string, SsrPreparationCallback[]>;

/**
 * Registers instance-local SSR preparation work that should run immediately
 * before a host is serialized.
 *
 * Decorators use this to defer SSR-only setup until after class fields,
 * reactive props, and authored host content have all been applied.
 *
 * @remarks Pass `true` for context bootstrap before the first `@onUpdated` flush.
 * Use `beforeAuthoredChildren` to publish context from host props before the SSR bridge builds its light DOM.
 */
export function registerSsrPreparationCallback(
	host: object,
	callback: SsrPreparationCallback,
	phase: SsrPreparationPhase = false,
): void {
	const lists = getCallbackLists(host) ?? createCallbackLists(host);
	(lists[String(phase)] ??= []).push(callback);
}

/**
 * Runs registered SSR preparation callbacks for the provided host.
 *
 * The callbacks are intentionally retained so repeated SSR serializations stay
 * deterministic after later host mutations.
 *
 * @remarks The default phase runs after the first `@onUpdated` flush.
 */
export function runSsrPreparationCallbacks(host: object, phase: SsrPreparationPhase = false): void {
	const callbacks = getCallbackLists(host)?.[String(phase)];

	if (!callbacks) {
		return;
	}

	for (const callback of callbacks) {
		callback();
	}
}

function getCallbackLists(host: object): SsrCallbackLists | undefined {
	return (host as Record<PropertyKey, SsrCallbackLists | undefined>)[SSR_PREPARATION_CALLBACKS];
}

function createCallbackLists(host: object): SsrCallbackLists {
	const lists: SsrCallbackLists = {};
	Object.defineProperty(host, SSR_PREPARATION_CALLBACKS, {
		value: lists,
		configurable: true,
	});
	return lists;
}
