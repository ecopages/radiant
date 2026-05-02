import type { ReactiveHostLike } from '../core/reactive-host';
import { reactiveField as legacyReactiveField } from './legacy/reactive-field';
import { reactiveField as standardReactiveField } from './standard/reactive-field';
import { fieldDecoratorBridge } from './bridge';

/**
 * Declares internal mutable component state.
 *
 * Each write triggers `notifyUpdate` so update callbacks, bindings, and
 * `RadiantElement` renders stay in sync. When no explicit binding option
 * is supplied, `RadiantElement` hosts expose a JSX companion binding
 * accessor automatically while plain imperative hosts keep binding
 * opt-in.
 */
export function state<THost extends ReactiveHostLike, TValue>(
	protoOrTarget: undefined,
	nameOrContext: ClassFieldDecoratorContext<THost, TValue>,
): (this: THost, value: TValue) => TValue;
export function state(protoOrTarget: ReactiveHostLike, nameOrContext: string): void;
export function state(
	protoOrTarget: ReactiveHostLike | undefined,
	nameOrContext: string | ClassFieldDecoratorContext<ReactiveHostLike, unknown>,
): ((this: ReactiveHostLike, value: unknown) => unknown) | void {
	return fieldDecoratorBridge(standardReactiveField, legacyReactiveField, protoOrTarget, nameOrContext);
}
