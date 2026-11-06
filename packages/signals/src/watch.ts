import { Computed } from './computed';
import { effect } from './effect';
import { defaultEquals } from './runtime';
import type { SignalEquals, WatchOptions } from './types';

/**
 * Watches a derived value and invokes `notify` when the exposed value changes
 * under the configured equality function.
 *
 * @remarks
 * Notifies on change, not per flush. The watch compares each run with the last
 * value it delivered (or the initial value), so a set followed by a set-back
 * before the scheduler runs does not notify. `previousValue` is that last
 * delivered value.
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
	const equals = (options.equals ?? defaultEquals) as SignalEquals<Value>;
	let previousValue: Value | undefined;
	let initialized = false;

	return effect(
		() => {
			const nextValue = watchedValue.get();

			if (!initialized) {
				initialized = true;
				previousValue = nextValue;
				if (options.immediate) {
					notify(nextValue, undefined);
				}
				return;
			}

			if (equals.call(watchedValue, previousValue as Value, nextValue)) {
				return;
			}

			const delivered = previousValue;
			previousValue = nextValue;
			notify(nextValue, delivered);
		},
		{ scheduler: options.scheduler },
	);
}
