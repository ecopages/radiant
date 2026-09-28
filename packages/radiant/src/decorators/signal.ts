import type { LegacyFieldDecoratorArgs } from '../types';
import type { ReactiveHostLike } from '../core/reactive-host';
import { signal as legacySignal, type SignalDecoratorOptions } from './legacy/signal';
import { signal as standardSignal } from './standard/signal';
import type { WritableSignal } from '@ecopages/signals';

export type { SignalDecoratorOptions } from './standard/signal';

type SignalDecorator<Value = unknown> = {
	<THost extends ReactiveHostLike>(
		protoOrTarget: undefined,
		nameOrContext: ClassFieldDecoratorContext<THost, WritableSignal<Value>>,
	): (this: THost, initialValue: Value | WritableSignal<Value>) => WritableSignal<Value>;
	(protoOrTarget: ReactiveHostLike, nameOrContext: string): void;
};

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
 */
export function signal<THost extends ReactiveHostLike, Value>(
	protoOrTarget: undefined,
	nameOrContext: ClassFieldDecoratorContext<THost, WritableSignal<Value>>,
): (this: THost, initialValue: Value | WritableSignal<Value>) => WritableSignal<Value>;
export function signal(protoOrTarget: ReactiveHostLike, nameOrContext: string): void;
export function signal<Value = unknown>(options?: SignalDecoratorOptions<Value>): SignalDecorator<Value>;
export function signal<Value = unknown>(
	protoOrOptions?: ReactiveHostLike | SignalDecoratorOptions<Value>,
	nameOrContext?: string | ClassFieldDecoratorContext<ReactiveHostLike, WritableSignal<Value>>,
):
	| ((this: ReactiveHostLike, initialValue: Value | WritableSignal<Value>) => WritableSignal<Value>)
	| SignalDecorator<Value>
	| void {
	if (typeof nameOrContext !== 'undefined') {
		if (typeof nameOrContext === 'object') {
			if (protoOrOptions !== undefined) {
				throw new TypeError('@signal standard decorators require an undefined target');
			}

			return standardSignal<Value>()(undefined, nameOrContext);
		}

		if (protoOrOptions === undefined) {
			throw new TypeError('@signal legacy decorators require a host target');
		}

		return legacySignal<Value>()(protoOrOptions as LegacyFieldDecoratorArgs['protoOrTarget'], nameOrContext);
	}

	const options = (protoOrOptions ?? {}) as SignalDecoratorOptions<Value>;

	function decorator<THost extends ReactiveHostLike>(
		protoOrTarget: undefined,
		contextOrName: ClassFieldDecoratorContext<THost, WritableSignal<Value>>,
	): (this: THost, initialValue: Value | WritableSignal<Value>) => WritableSignal<Value>;
	function decorator(protoOrTarget: ReactiveHostLike, contextOrName: string): void;
	function decorator(
		protoOrTarget: ReactiveHostLike | undefined,
		contextOrName: string | ClassFieldDecoratorContext<ReactiveHostLike, WritableSignal<Value>>,
	): ((this: ReactiveHostLike, initialValue: Value | WritableSignal<Value>) => WritableSignal<Value>) | void {
		if (typeof contextOrName === 'object') {
			if (protoOrTarget !== undefined) {
				throw new TypeError('@signal standard decorators require an undefined target');
			}

			return standardSignal<Value>(options)(undefined, contextOrName);
		}

		if (protoOrTarget === undefined) {
			throw new TypeError('@signal legacy decorators require a host target');
		}

		return legacySignal<Value>(options)(protoOrTarget as LegacyFieldDecoratorArgs['protoOrTarget'], contextOrName);
	}

	return decorator;
}
