import type { WritableSignal } from '@ecopages/signals';
import type { ReactiveBindingOption } from '../../core/reactive-prop-core';
import type { ReactiveHostLike } from '../../core/reactive-host';
import type { AttributeTypeConstant } from '../../utils/attribute-utils';

/** Options for the `@signal` decorator. */
export type SignalDecoratorOptions<Value = unknown> = {
	/**
	 * Exposes a JSX binding companion for the decorated signal.
	 *
	 * - `true` creates a `$propertyName` accessor.
	 * - a string creates a custom accessor with that name.
	 * - `undefined` defers to the host default.
	 */
	bind?: ReactiveBindingOption;

	/**
	 * Optional initial value used when the field does not provide one directly.
	 *
	 * @remarks Lets the decorator own signal construction while the field stays
	 * a bare declaration: `@signal({ initial: 'idle' }) status!: WritableSignal<string>`.
	 */
	initial?: Value;

	/**
	 * Connects an existing writable signal to the host instead of creating a
	 * host-owned one.
	 */
	source?: WritableSignal<Value> | ((host: ReactiveHostLike) => WritableSignal<Value>);

	/**
	 * Serializes the current signal value into a keyed hydration script during
	 * SSR and restores it on the client.
	 */
	hydrate?: AttributeTypeConstant;
};
