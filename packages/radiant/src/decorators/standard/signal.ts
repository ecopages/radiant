import type { WritableSignal } from '@ecopages/signals';
import type { RadiantElement, ReactiveBindingOption } from '../../core/radiant-element';
import { createHostSignal, isWritableSignalLike } from '../../signals/host-signal';
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
	 * This is primarily useful with `declare field: WritableSignal<T>` syntax,
	 * which keeps the component surface clean while still letting the decorator
	 * own signal construction.
	 */
	initial?: Value;

	/**
	 * Connects an existing writable signal to the host instead of creating a
	 * host-owned one.
	 */
	source?: WritableSignal<Value> | ((host: RadiantElement) => WritableSignal<Value>);

	/**
	 * Serializes the current signal value into a keyed hydration script during
	 * SSR and restores it on the client.
	 */
	hydrate?: AttributeTypeConstant;
};

export function signal<Value = unknown>(options: SignalDecoratorOptions<Value> = {}) {
	return function <T extends RadiantElement, Value>(_: undefined, context: ClassFieldDecoratorContext<T, unknown>) {
		const propertyName = String(context.name);

		return function (this: T, initialValue: Value) {
			const resolvedSource =
				typeof options.source === 'function'
					? options.source(this)
					: options.source ?? (isWritableSignalLike<Value>(initialValue) ? initialValue : undefined);
			const resolvedInitialValue =
				resolvedSource !== undefined
					? options.initial
					: ((initialValue === undefined ? options.initial : initialValue) as Value);
			const bind =
				options.bind ??
				(
					this as unknown as { shouldAutoBindReactiveMembers?: () => boolean }
				).shouldAutoBindReactiveMembers?.() ??
				false;

			this.defineReactiveBinding(propertyName, bind);

			const hostSignal = createHostSignal({
				host: this,
				hydrate: options.hydrate,
				hydrationKey: propertyName,
				initialValue: resolvedInitialValue,
				property: propertyName,
				source: resolvedSource,
			});

			this.registerConnectedCallback(() => {
				hostSignal.hydrateFromHost();
				hostSignal.connectToSource();
			});
			this.registerCleanupCallback(() => {
				hostSignal.disconnectFromSource();
			});

			if (options.hydrate) {
				this.registerHydrationBinding(propertyName, hostSignal);
			}

			return hostSignal as unknown as WritableSignal<Value>;
		};
	};
}
