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
 * consume directly in child or attribute positions. Signal updates also flow
 * back through Radiant's update callback channel so `@onUpdated(...)` and
 * `this.$.name` bindings continue to work. On `RadiantComponent`, signal
 * writes also queue a rerender so `render()` logic that reads `signal.get()`
 * or derived snapshots stays in sync without manual `update()` calls.
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
