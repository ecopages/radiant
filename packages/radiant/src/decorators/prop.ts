import type { ReactivePropertyOptions } from '../core/radiant-element';
import type { StandardOrLegacyFieldDecoratorArgs } from '../types';
import { reactiveProp as legacyReactiveProp } from './legacy/reactive-prop';
import { reactiveProp as standardReactiveProp } from './standard/reactive-prop';
import { fieldDecoratorBridge } from './bridge';

/**
 * Declares a reactive property backed by an HTML attribute.
 *
 * Every write triggers `notifyUpdate` so update callbacks, bindings, and
 * `RadiantComponent` renders stay in sync. When no explicit `bind` option
 * is supplied, `RadiantComponent` hosts expose a JSX companion binding
 * accessor automatically while plain `RadiantElement` hosts keep binding
 * opt-in.
 *
 * @param options {@link ReactivePropertyOptions} The options for the reactive property.
 */
export function prop<T = unknown>(options: ReactivePropertyOptions<T>) {
	return function (
		protoOrTarget: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'],
		nameOrContext: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
	): any {
		return fieldDecoratorBridge(
			standardReactiveProp(options),
			legacyReactiveProp(options),
			protoOrTarget,
			nameOrContext,
		);
	};
}
