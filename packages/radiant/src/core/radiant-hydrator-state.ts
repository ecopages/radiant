const RADIANT_HYDRATOR_INSTALLED_SYMBOL = Symbol.for('@ecopages/radiant.hydrator-installed');

type GlobalHydratorState = typeof globalThis & Record<PropertyKey, unknown>;

/**
 * Marks the current JavaScript environment as hydration-enabled for first
 * custom-element connect.
 *
 * `RadiantComponent` reads this flag before deciding whether SSR markup should
 * hydrate in place or be replaced by a fresh client render.
 */
export function installRadiantHydratorState(): void {
	(globalThis as GlobalHydratorState)[RADIANT_HYDRATOR_INSTALLED_SYMBOL] = true;
}

/**
 * Clears the explicit hydration-enabled flag from `globalThis`.
 *
 * This is mainly used by tests so they can assert both hydrated and non-
 * hydrated first-connect behavior deterministically.
 */
export function uninstallRadiantHydratorState(): void {
	delete (globalThis as GlobalHydratorState)[RADIANT_HYDRATOR_INSTALLED_SYMBOL];
}

/**
 * Returns whether first-connect hydration is currently enabled for this
 * JavaScript environment.
 */
export function isRadiantHydratorInstalled(): boolean {
	return (globalThis as GlobalHydratorState)[RADIANT_HYDRATOR_INSTALLED_SYMBOL] === true;
}
