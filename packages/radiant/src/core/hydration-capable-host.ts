import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';

/**
 * Hosts that can register keyed SSR hydration bindings.
 */
export interface HydrationCapableHost {
	registerHydrationBinding(name: string, binding: SsrSerializableHydrationBinding): void;
}

export function isHydrationCapableHost(host: object): host is HydrationCapableHost {
	return typeof (host as HydrationCapableHost).registerHydrationBinding === 'function';
}
