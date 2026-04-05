import type { ReactivePropertyOptions } from '../core/radiant-element';
import type { StandardOrLegacyFieldDecoratorArgs } from '../types';
import { reactiveProp as legacyReactiveProp } from './legacy/reactive-prop';
import { reactiveProp as standardReactiveProp } from './standard/reactive-prop';
import { fieldDecoratorBridge } from './bridge';

/**
 * A decorator to define a reactive property.
 * Every time the property changes, the `updated` method will be called.
 * @param options {@link ReactivePropertyOptions} The options for the reactive property.
 */
export function reactiveProp<T = unknown>(options: ReactivePropertyOptions<T>) {
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
