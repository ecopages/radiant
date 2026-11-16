import { HostSignal } from '../../signals/host-signal';
import type { ReactiveHostLike } from '../../core/reactive-host';
import { installHostSignal } from '../shared/signal';
import { registerLegacyPostConstructionInitializer } from './instance-initializers';
import type { SignalDecoratorOptions } from '../shared/signal-options';

export function signal<Value = unknown>(options: SignalDecoratorOptions<Value> = {}) {
	return (target: ReactiveHostLike, propertyName: string) => {
		registerLegacyPostConstructionInitializer(target, (element) => {
			const currentValue = (element as unknown as Record<string, unknown>)[propertyName] as
				| Value
				| undefined;
			const hostSignal = installHostSignal(element, propertyName, options, currentValue);
			(element as unknown as Record<string, unknown>)[propertyName] = hostSignal;

			element.registerConnectedCallback(() => {
				const current = (element as unknown as Record<string, unknown>)[propertyName];
				if (!(current instanceof HostSignal)) {
					(element as unknown as Record<string, unknown>)[propertyName] = hostSignal;
				}
			});
		});
	};
}
