import { Computed } from './computed';
import { effect } from './effect';
import type { WatchOptions } from './types';

/**
 * Watches a derived value and invokes `notify` when the exposed value changes
 * under the configured equality function.
 *
 * This helper combines a computed signal with an effect so callers can observe
 * derived state without manually managing previous values.
 */
export function watch<Value>(
	read: () => Value,
	notify: (nextValue: Value, previousValue: Value | undefined) => void,
	options: WatchOptions<Value> = {},
): () => void {
	const watchedValue = new Computed(read, { equals: options.equals });
	let previousValue: Value | undefined;
	let initialized = false;

	return effect(
		() => {
			const nextValue = watchedValue.get();

			if (initialized) {
				notify(nextValue, previousValue);
			} else if (options.immediate) {
				notify(nextValue, undefined);
			}

			previousValue = nextValue;
			initialized = true;
		},
		{ scheduler: options.scheduler },
	);
}
