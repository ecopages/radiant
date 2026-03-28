import type { RadiantElement, ReactiveBindingOption } from '../../core/radiant-element';
import { createHostSignal, HostSignal, isWritableSignalLike } from '../../signals/host-signal';
import { registerLegacyInstanceInitializer } from './instance-initializers';
import type { AttributeTypeConstant } from '../../utils/attribute-utils';
import type { WritableSignal } from '@ecopages/signals';

export type SignalDecoratorOptions<Value = unknown> = {
	bind?: ReactiveBindingOption;
	initial?: Value;
	source?: WritableSignal<Value> | ((host: RadiantElement) => WritableSignal<Value>);
	hydrate?: AttributeTypeConstant;
};

export function signal<Value = unknown>(options: SignalDecoratorOptions<Value> = {}) {
	return (target: RadiantElement, propertyName: string) => {
		const initializeSignal = (element: RadiantElement): HostSignal<unknown> => {
			const currentValue = element[propertyName as keyof typeof element] as unknown;

			if (currentValue instanceof HostSignal) {
				return currentValue;
			}

			const resolvedSource =
				typeof options.source === 'function'
					? options.source(element)
					: (options.source ?? (isWritableSignalLike(currentValue) ? currentValue : undefined));

			const bind =
				options.bind ??
				(
					element as unknown as { shouldAutoBindReactiveMembers?: () => boolean }
				).shouldAutoBindReactiveMembers?.() ??
				false;

			const resolvedInitialValue =
				resolvedSource !== undefined
					? options.initial
					: ((currentValue === undefined ? options.initial : currentValue) as Value);
			element.defineReactiveBinding(propertyName, bind);

			const hostSignal = createHostSignal({
				host: element,
				hydrate: options.hydrate,
				hydrationKey: propertyName,
				initialValue: resolvedInitialValue,
				property: propertyName,
				source: resolvedSource,
			});

			element.registerConnectedCallback(() => {
				hostSignal.hydrateFromHost();
				hostSignal.connectToSource();
			});
			element.registerCleanupCallback(() => {
				hostSignal.disconnectFromSource();
			});

			if (options.hydrate) {
				element.registerHydrationBinding(propertyName, hostSignal);
			}

			(element as unknown as Record<string, unknown>)[propertyName] = hostSignal;
			return hostSignal as unknown as HostSignal<unknown>;
		};

		registerLegacyInstanceInitializer(target, initializeSignal);
		const originalConnectedCallback = target.connectedCallback;

		target.connectedCallback = function (this: RadiantElement) {
			initializeSignal(this);
			originalConnectedCallback.call(this);
		};
	};
}
