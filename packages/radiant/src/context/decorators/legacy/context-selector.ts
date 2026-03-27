import type { RadiantElement } from '../../../core/radiant-element';
import { registerLegacyInstanceInitializer } from '../../../decorators/legacy/instance-initializers';
import { bootstrapSsrContextSelection, connectContextSelection } from '../../context-consumer-bootstrap';
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
		const applySelectedContext = (element: RadiantElement, value: unknown) => {
			originalMethod.call(element, value);
		};

		registerLegacyInstanceInitializer(proto, (element) => {
			bootstrapSsrContextSelection(
				element,
				context,
				(value) => {
					applySelectedContext(element, value);
				},
				select,
			);
		});

		const originalConnectedCallback = proto.connectedCallback;

		proto.connectedCallback = function (this: RadiantElement) {
			originalConnectedCallback.call(this);

			if (connectContextSelection(this, context, (value) => applySelectedContext(this, value), { select, subscribe })) {
				return;
			}
		};

		descriptor.value = function (...args: ArgsType<T>[]) {
			const result = originalMethod.apply(this, args);
			return result;
		};

		return descriptor;
	};
}
