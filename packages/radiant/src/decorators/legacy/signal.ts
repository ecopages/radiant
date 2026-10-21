import { createHostSignal, HostSignal, isWritableSignalLike } from '../../signals/host-signal';
import { REACTIVE_HOST, type ReactiveHostLike } from '../../core/reactive-host';
import { resolveHostAutoBind } from '../shared/auto-bind';
import { registerLegacyPostConstructionInitializer } from './instance-initializers';
import type { SignalDecoratorOptions } from '../shared/signal-options';

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

			const bind = options.bind ?? resolveHostAutoBind(element);

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
				element[REACTIVE_HOST].ssrRegistry.registerHydrationBinding(propertyName, hostSignal);
			}

			(element as unknown as Record<string, unknown>)[propertyName] = hostSignal;
			return hostSignal as unknown as HostSignal<unknown>;
		};

		registerLegacyPostConstructionInitializer(target, (element) => {
			const hostSignal = initializeSignal(element);
			element.registerConnectedCallback(() => {
				if (!((element as any)[propertyName] instanceof HostSignal)) {
					(element as unknown as Record<string, unknown>)[propertyName] = hostSignal;
				}
			});
		});
	};
}
