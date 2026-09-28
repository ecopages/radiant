import {
	isRadiantHydratorInstalled,
	installRadiantHydratorState,
	uninstallRadiantHydratorState,
} from '../core/radiant-hydrator-state';

/**
 * Enables first-connect hydration for SSR-rendered RadiantElement hosts.
 *
 * Import this from SSR pages before loading component modules so upgraded
 * custom elements hydrate their existing DOM instead of performing a fresh
 * client render on first connect.
 */
export function installRadiantHydrator(): void {
	installRadiantHydratorState();
}

/**
 * Disables the explicit Radiant hydrator gate.
 *
 * This is primarily useful for tests and controlled bootstrap scenarios where
 * SSR hosts should intentionally fall back to a fresh client render.
 */
export function uninstallRadiantHydrator(): void {
	uninstallRadiantHydratorState();
}

/**
 * Returns whether the explicit Radiant hydrator gate is currently enabled.
 */
export function hasRadiantHydrator(): boolean {
	return isRadiantHydratorInstalled();
}
