import type { RadiantElement, ReactiveBindingOption } from '../../core/radiant-element';
import { createHostSignal, HostSignal } from '../../signals/host-signal';
import { registerLegacyInstanceInitializer } from './instance-initializers';
import type { AttributeTypeConstant } from '../../utils/attribute-utils';

export type SignalDecoratorOptions<Value = unknown> = {
	bind?: ReactiveBindingOption;
	initial?: Value;
	hydrate?: AttributeTypeConstant;
};

export function signal<Value = unknown>(options: SignalDecoratorOptions<Value> = {}) {
	return (target: RadiantElement, propertyName: string) => {
		const initializeSignal = (element: RadiantElement): HostSignal<unknown> => {
			const currentValue = element[propertyName as keyof typeof element] as unknown;

			if (currentValue instanceof HostSignal) {
				return currentValue;
			}

			const bind =
				options.bind ??
				(
					element as unknown as { shouldAutoBindReactiveMembers?: () => boolean }
				).shouldAutoBindReactiveMembers?.() ??
				false;

			const resolvedInitialValue = (currentValue === undefined ? options.initial : currentValue) as Value;
			element.defineReactiveBinding(propertyName, bind);

			const hostSignal = createHostSignal({
				host: element,
				hydrate: options.hydrate,
				hydrationKey: propertyName,
				initialValue: resolvedInitialValue,
				property: propertyName,
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
			const hostSignal = initializeSignal(this);
			hostSignal.hydrateFromHost();

			originalConnectedCallback.call(this);
		};
	};
}
