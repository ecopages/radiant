type SsrPreparationCallback = () => void;

/**
 * When a preparation callback runs, in the order the phases occur for one host:
 *
 * - `beforeAuthoredChildren`: before the host's Authored Children are built, so descendants can read context
 *   published from host props. Only the SSR bridge's `applyLightDom`, for a host the bridge claims, and
 *   `renderComponent` run it, and it runs before the host's `@consumeContext` fields resolve.
 * - `beforeOnUpdated`: context bootstrap, before the first `@onUpdated` flush.
 * - `afterOnUpdated`: after that flush. This is the default.
 */
export type SsrPreparationPhase = 'beforeAuthoredChildren' | 'beforeOnUpdated' | 'afterOnUpdated';

const SSR_PREPARATION_CALLBACKS = Symbol.for('@ecopages/radiant.ssr-preparation-callbacks');

type SsrCallbackLists = Partial<Record<SsrPreparationPhase, SsrPreparationCallback[]>>;

/**
 * Registers instance-local SSR preparation work that should run immediately
 * before a host is serialized.
 *
 * Decorators use this to defer SSR-only setup until after class fields,
 * reactive props, and authored host content have all been applied.
 *
 * @remarks `beforeAuthoredChildren` is the exception to the above: it runs before the host's Authored Children
 * exist. See {@link SsrPreparationPhase}.
 */
export function registerSsrPreparationCallback(
	host: object,
	callback: SsrPreparationCallback,
	phase: SsrPreparationPhase = 'afterOnUpdated',
): void {
	const lists = getCallbackLists(host) ?? createCallbackLists(host);
	(lists[phase] ??= []).push(callback);
}

/**
 * Runs the callbacks registered for one phase of the provided host.
 *
 * The callbacks are intentionally retained so repeated SSR serializations stay
 * deterministic after later host mutations.
 */
export function runSsrPreparationCallbacks(host: object, phase: SsrPreparationPhase = 'afterOnUpdated'): void {
	const callbacks = getCallbackLists(host)?.[phase];

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
