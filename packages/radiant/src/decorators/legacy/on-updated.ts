import type { UpdatedCallback } from '../../core/reactive-host';
import { registerLegacyInstanceInitializer } from './instance-initializers';

type LegacyUpdatedHost = {
	registerUpdatedCallback(keys: readonly string[], callback: UpdatedCallback): () => void;
};

/**
 * Legacy-decorator implementation for `@onUpdated(...)`.
 *
 * @param keyOrKeys - Reactive members whose changes run the method once per update cycle.
 */
export function onUpdated(keyOrKeys: string | string[]) {
	const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];

	return (target: LegacyUpdatedHost, methodName: string) => {
		registerLegacyInstanceInitializer(target, (element) => {
			const method = (element as unknown as Record<string, UpdatedCallback>)[methodName];
			element.registerUpdatedCallback(keys, method.bind(element));
		});
	};
}
