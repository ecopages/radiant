import type { ReactiveBindingOption } from '../../core/reactive-prop-core';
import { createHostSignal, HostSignal, isWritableSignalLike } from '../../signals/host-signal';
import { isHydrationCapableHost } from '../../core/hydration-capable-host';
import type { ReactiveHostLike } from '../../core/reactive-host';
import { registerLegacyPostConstructionInitializer } from './instance-initializers';
import type { AttributeTypeConstant } from '../../utils/attribute-utils';
import type { WritableSignal } from '@ecopages/signals';

export type SignalDecoratorOptions<Value = unknown> = {
	bind?: ReactiveBindingOption;
	initial?: Value;
	source?: WritableSignal<Value> | ((host: ReactiveHostLike) => WritableSignal<Value>);
	hydrate?: AttributeTypeConstant;
};

export function signal<Value = unknown>(options: SignalDecoratorOptions<Value> = {}) {
	return (target: ReactiveHostLike, propertyName: string) => {
		const initializeSignal = (element: ReactiveHostLike): HostSignal<unknown> => {
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

			if (options.hydrate && isHydrationCapableHost(element)) {
				element.registerHydrationBinding(propertyName, hostSignal);
			}

			(element as unknown as Record<string, unknown>)[propertyName] = hostSignal;
			return hostSignal as unknown as HostSignal<unknown>;
		};

		registerLegacyPostConstructionInitializer(target, (element, _phase) => {
			const hostSignal = initializeSignal(element);
			element.registerConnectedCallback(() => {
				if (!((element as any)[propertyName] instanceof HostSignal)) {
					(element as unknown as Record<string, unknown>)[propertyName] = hostSignal;
				}
			});
		});
	};
}
