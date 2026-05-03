type LegacyUpdatedHost = {
	registerCleanupCallback(callback: () => void): void;
	registerConnectedCallback(callback: () => void): void;
	registerUpdateCallback(key: string, update: (...rest: any[]) => any): () => void;
};

import { registerLegacyInstanceInitializer } from './instance-initializers';

/**
 * A decorator to subscribe to an updated callback when a reactive field or property changes.
 * @param eventConfig The event configuration.
 */
export function onUpdated(keyOrKeys: string | string[]) {
	return (target: LegacyUpdatedHost, methodName: string) => {
		const cleanupKey = Symbol(`@ecopages/radiant/on-updated:${methodName}:cleanup`);

		registerLegacyInstanceInitializer(target, (element) => {
			element.registerConnectedCallback(() => {
				const boundedMethod = (element as any)[methodName].bind(element);
				const cleanups: Array<() => void> = [];

				if (Array.isArray(keyOrKeys)) {
					for (const key of keyOrKeys) {
						cleanups.push(element.registerUpdateCallback(key, boundedMethod));
					}
				} else if (typeof keyOrKeys === 'string') {
					cleanups.push(element.registerUpdateCallback(keyOrKeys, boundedMethod));
				}

				(element as unknown as Record<PropertyKey, unknown>)[cleanupKey] = () => {
					for (const cleanup of cleanups) {
						cleanup();
					}
				};
			});

			element.registerCleanupCallback(() => {
				const cleanup = (element as unknown as Record<PropertyKey, unknown>)[cleanupKey];

				if (typeof cleanup === 'function') {
					cleanup();
					delete (element as unknown as Record<PropertyKey, unknown>)[cleanupKey];
				}
			});
		});
	};
}
