import type { ReactiveHostLike } from '../core/reactive-host';
import { fieldDecorator, fieldDecoratorBridge, type ValueFieldDecorator } from './bridge';
import { signal as legacySignal } from './legacy/signal';
import type { SignalDecoratorOptions } from './shared/signal-options';
import { signal as standardSignal } from './standard/signal';
import type { WritableSignal } from '@ecopages/signals';

export type { SignalDecoratorOptions } from './shared/signal-options';

export function signal(protoOrTarget: ReactiveHostLike, nameOrContext: string): void;
/** Bare `@signal`: a host-owned writable signal field, as `@signal()` declares. */
export function signal<THost extends ReactiveHostLike, T>(
	protoOrTarget: undefined,
	nameOrContext: ClassFieldDecoratorContext<THost, WritableSignal<T>>,
): (this: THost, initialValue: T | WritableSignal<T>) => WritableSignal<T>;
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
 * `RadiantElement`, any signal or store reads performed during `render()`
 * now participate in rerender invalidation directly, which makes module-level
 * shared stores a natural fit without prop-bridging them through a second
 * reactive layer.
 *
 * When `hydrate` is provided, SSR host output appends a keyed JSON script so
 * the client can restore the signal's initial value during hydration.
 *
 * The declared `WritableSignal<T>` is the source of truth: `initial` and
 * `source` must agree with its `T`, and are checked against it under standard
 * decorators.
 *
 * @remarks
 * Besides the error on the mismatched option, TypeScript reports "Unable to
 * resolve signature of property decorator" on the decorator: a failed
 * `signal(options)` call takes its return type from the legacy overload.
 */
export function signal<T = unknown>(
	options?: SignalDecoratorOptions<NoInfer<T>>,
): ValueFieldDecorator<ReactiveHostLike, WritableSignal<T>>;
/**
 * @remarks
 * The second argument tells the forms apart: `@signal(options)` passes none,
 * so the first argument is the options; the bare `@signal` passes a name or a
 * context, so the first argument is the legacy prototype or `undefined`.
 */
export function signal<T>(
	optionsOrTarget?: SignalDecoratorOptions<T> | ReactiveHostLike,
	nameOrContext?: string | ClassFieldDecoratorContext<ReactiveHostLike, WritableSignal<T>>,
):
	| ValueFieldDecorator<ReactiveHostLike, WritableSignal<T>>
	| ((this: ReactiveHostLike, initialValue: T | WritableSignal<T>) => WritableSignal<T>)
	| void {
	if (nameOrContext === undefined) {
		const options = optionsOrTarget as SignalDecoratorOptions<T> | undefined;

		return fieldDecorator(standardSignal(options), legacySignal(options));
	}

	return fieldDecoratorBridge(
		standardSignal<T>(),
		legacySignal<T>(),
		optionsOrTarget as ReactiveHostLike | undefined,
		nameOrContext,
	);
}
