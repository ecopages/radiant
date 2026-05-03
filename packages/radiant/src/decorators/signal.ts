import type {
	LegacyFieldDecoratorArgs,
	StandardFieldDecoratorArgs,
	StandardOrLegacyFieldDecoratorArgs,
} from '../types';
import { signal as legacySignal, type SignalDecoratorOptions } from './legacy/signal';
import { signal as standardSignal } from './standard/signal';

export type { SignalDecoratorOptions } from './standard/signal';

/**
 * Declares a host-aware writable signal field.
 *
 * The decorated member becomes a real `WritableSignal` instance that JSX can
 * consume directly in child or attribute positions. By default the decorator
 * creates a host-owned signal, but it can also connect an existing shared
 * signal through the `source` option or a signal-valued field initializer.
 *
 * Connected signals still flow through Radiant's update callback channel so
 * `@onUpdated(...)` and `this.$.name` bindings continue to work. On
 * `RadiantComponent`, any signal or store reads performed during `render()`
 * now participate in rerender invalidation directly, which makes module-level
 * shared stores a natural fit without prop-bridging them through a second
 * reactive layer.
 *
 * When `hydrate` is provided, SSR host output appends a keyed JSON script so
 * the client can restore the signal's initial value during hydration.
 */
export function signal(
	protoOrTarget: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'],
	nameOrContext: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
): any;
export function signal(options?: SignalDecoratorOptions): any;
export function signal(
	protoOrOptions?: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'] | SignalDecoratorOptions,
	nameOrContext?: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
): any {
	if (typeof nameOrContext !== 'undefined') {
		if (typeof nameOrContext === 'object') {
			return standardSignal()(protoOrOptions as StandardFieldDecoratorArgs['protoOrTarget'], nameOrContext);
		}

		return legacySignal()(protoOrOptions as LegacyFieldDecoratorArgs['protoOrTarget'], nameOrContext);
	}

	const options = (protoOrOptions ?? {}) as SignalDecoratorOptions;

	return function (
		protoOrTarget: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'],
		contextOrName: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
	): any {
		if (typeof contextOrName === 'object') {
			return standardSignal(options)(
				protoOrTarget as StandardFieldDecoratorArgs['protoOrTarget'],
				contextOrName as StandardFieldDecoratorArgs['nameOrContext'],
			);
		}

		return legacySignal(options)(
			protoOrTarget as LegacyFieldDecoratorArgs['protoOrTarget'],
			contextOrName as LegacyFieldDecoratorArgs['nameOrContext'],
		);
	};
}
