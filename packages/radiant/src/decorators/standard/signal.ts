import type { WritableSignal } from '@ecopages/signals';
import { REACTIVE_HOST, type ReactiveHostLike } from '../../core/reactive-host';
import { resolveHostAutoBind } from '../shared/auto-bind';
import { createHostSignal, isWritableSignalLike } from '../../signals/host-signal';
import type { SignalDecoratorOptions } from '../shared/signal-options';

export function signal<Value = unknown>(options: SignalDecoratorOptions<Value> = {}) {
	return function <T extends ReactiveHostLike>(
		_: undefined,
		context: ClassFieldDecoratorContext<T, WritableSignal<Value>>,
	) {
		const propertyName = String(context.name);

		return function (this: T, initialValue: Value | WritableSignal<Value>): WritableSignal<Value> {
			const resolvedSource =
				typeof options.source === 'function'
					? options.source(this)
					: (options.source ?? (isWritableSignalLike<Value>(initialValue) ? initialValue : undefined));
			const resolvedInitialValue =
				resolvedSource !== undefined
					? options.initial
					: ((initialValue === undefined ? options.initial : initialValue) as Value);
			const bind = options.bind ?? resolveHostAutoBind(this);

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
				this[REACTIVE_HOST].ssrRegistry.registerHydrationBinding(propertyName, hostSignal);
			}

			return hostSignal;
		};
	};
}
