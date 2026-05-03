import type { ReactivePropertyOptions } from '../core/radiant-element';
import { reactiveProp as legacyReactiveProp } from './legacy/reactive-prop';
import { reactiveProp as standardReactiveProp } from './standard/reactive-prop';
import { fieldDecoratorBridge } from './bridge';

type StandardReactivePropHost<T> = {
	createReactiveProp(propertyName: string, options: ReactivePropertyOptions<T>): void;
};

type LegacyReactivePropHost<T> = StandardReactivePropHost<T> & {
	registerConnectedCallback(callback: () => void): void;
};

/**
 * Declares a reactive property on a Radiant host.
 *
 * On `RadiantElement`, the property stays aligned with the element attribute
 * channel and can optionally reflect back to markup. On `RadiantController`,
 * the property is exposed through the attached host element as a real JS
 * property so callers can pass objects, arrays, and other non-string values
 * without serializing them into attributes.
 *
 * Every write triggers `notifyUpdate` so update callbacks, bindings, and
 * render lifecycles stay in sync.
 *
 * @param options {@link ReactivePropertyOptions} The options for the reactive property.
 */
export function prop<T = unknown>(options: ReactivePropertyOptions<T>) {
	function decorator<THost extends StandardReactivePropHost<T>, TValue>(
		protoOrTarget: undefined,
		nameOrContext: ClassFieldDecoratorContext<THost, TValue>,
	): ((this: THost, value: TValue) => TValue) | void;
	function decorator(protoOrTarget: LegacyReactivePropHost<T>, nameOrContext: string): void;
	function decorator(
		protoOrTarget: LegacyReactivePropHost<T> | undefined,
		nameOrContext: string | ClassFieldDecoratorContext<StandardReactivePropHost<T>, unknown>,
	): ((this: StandardReactivePropHost<T>, value: unknown) => unknown) | void {
		return fieldDecoratorBridge(
			standardReactiveProp(options),
			legacyReactiveProp(options),
			protoOrTarget,
			nameOrContext,
		);
	}

	return decorator;
}
