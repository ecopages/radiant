type SsrPreparationCallback = () => void;

const SSR_PREPARATION_CALLBACKS = Symbol();
export const SSR_PREPARATION_RUNNING = Symbol();

/**
 * Registers instance-local SSR preparation work that should run immediately
 * before a Radiant host serializes its first server render.
 *
 * Decorators use this to defer SSR-only setup until after class fields,
 * reactive props, and authored host content have all been applied.
 */
export function registerSsrPreparationCallback(host: object, callback: SsrPreparationCallback): void {
	const target = host as Record<PropertyKey, unknown>;
	const existingCallbacks = target[SSR_PREPARATION_CALLBACKS];

	if (Array.isArray(existingCallbacks)) {
		existingCallbacks.push(callback);
		return;
	}

	Object.defineProperty(host, SSR_PREPARATION_CALLBACKS, {
		value: [callback],
		configurable: true,
	});
}

/**
 * Runs all registered SSR preparation callbacks for the provided host.
 *
 * The callbacks are intentionally retained so repeated SSR serializations stay
 * deterministic after later host mutations.
 */
export function runSsrPreparationCallbacks(host: object): void {
	const target = host as Record<PropertyKey, unknown>;
	const callbacks = target[SSR_PREPARATION_CALLBACKS];

	if (!Array.isArray(callbacks)) {
		return;
	}

	target[SSR_PREPARATION_RUNNING] = true;

	try {
		for (const callback of callbacks as SsrPreparationCallback[]) {
			callback();
		}
	} finally {
		delete target[SSR_PREPARATION_RUNNING];
	}
}
