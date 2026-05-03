import type { RadiantElement } from '../../core/radiant-element';
import { registerLegacyInstanceInitializer } from './instance-initializers';

/**
 * A decorator to subscribe to an updated callback when a reactive field or property changes.
 * @param eventConfig The event configuration.
 */
export function onUpdated(keyOrKeys: string | string[]) {
	return (target: RadiantElement, methodName: string) => {
		registerLegacyInstanceInitializer(target, (element) => {
			element.registerConnectedCallback(() => {
				const boundedMethod = (element as any)[methodName].bind(element);
				if (Array.isArray(keyOrKeys)) {
					for (const key of keyOrKeys) {
						element.registerUpdateCallback(key, boundedMethod);
					}
				} else if (typeof keyOrKeys === 'string') {
					element.registerUpdateCallback(keyOrKeys, boundedMethod);
				}
			});
		});
	};
}
