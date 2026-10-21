import type { ReactiveHostLike } from '../core/reactive-host';
import { reactiveField as legacyReactiveField } from './legacy/reactive-field';
import { reactiveField as standardReactiveField } from './standard/reactive-field';
import { fieldDecoratorBridge } from './bridge';

export function state(protoOrTarget: ReactiveHostLike, nameOrContext: string): void;
/**
 * Declares internal mutable component state.
 *
 * Each write updates the member state, which notifies `@onUpdated` listeners and
 * keeps JSX bindings in sync. Render invalidation happens through the reactive
 * render path when `render()` reads reactive members. When no explicit binding option
 * is supplied, `RadiantElement` hosts expose a JSX companion binding
 * accessor automatically while plain imperative hosts keep binding
 * opt-in.
 *
 * @remarks
 * `@state` is applied directly rather than returned by a factory, so it
 * declares its own overloads and infers the value type per field. The legacy
 * overload comes first so that a failed standard check reports the standard
 * overload.
 */
export function state<THost extends ReactiveHostLike, TValue>(
	protoOrTarget: undefined,
	nameOrContext: ClassFieldDecoratorContext<THost, TValue>,
): (this: THost, value: TValue) => TValue;
export function state(
	protoOrTarget: ReactiveHostLike | undefined,
	nameOrContext: string | ClassFieldDecoratorContext<ReactiveHostLike, unknown>,
): ((this: ReactiveHostLike, value: unknown) => unknown) | void {
	return fieldDecoratorBridge(standardReactiveField, legacyReactiveField, protoOrTarget, nameOrContext);
}
