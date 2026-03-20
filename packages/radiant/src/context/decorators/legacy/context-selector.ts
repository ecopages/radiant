import type { RadiantElement } from '../../../core/radiant-element';
import { registerLegacyInstanceInitializer } from '../../../decorators/legacy/instance-initializers';
import { initializeContextSelection, requestContextSelection } from '../../context-consumer-runtime';
import type { Context, ContextType, UnknownContext } from '../../types';
import type { SubscribeToContextOptions } from '../context-selector';

type ArgsType<T extends UnknownContext> = SubscribeToContextOptions<T>['select'] extends (...args: any[]) => infer R
	? R
	: ContextType<T>;

export function contextSelector<T extends Context<unknown, unknown>>({
	context,
	select,
	subscribe = true,
}: SubscribeToContextOptions<T>) {
	return (proto: RadiantElement, _: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;
		const initializeSsrSelection = (element: RadiantElement) => {
			return initializeContextSelection(
				context,
				(value) => {
					originalMethod.call(element, value);
				},
				select,
			);
		};

		registerLegacyInstanceInitializer(proto, initializeSsrSelection);
		const originalConnectedCallback = proto.connectedCallback;

		proto.connectedCallback = function (this: RadiantElement) {
			originalConnectedCallback.call(this);

			if (initializeSsrSelection(this)) {
				return;
			}

			requestContextSelection(this, context, originalMethod.bind(this), { select, subscribe });
		};

		descriptor.value = function (...args: ArgsType<T>[]) {
			const result = originalMethod.apply(this, args);
			return result;
		};

		return descriptor;
	};
}
