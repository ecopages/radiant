import type { RadiantElement } from '../../../core/radiant-element';
import { registerLegacyInstanceInitializer } from '../../../decorators/legacy/instance-initializers';
import { bootstrapSsrContextSelection, connectContextSelection } from '../../context-consumer-bootstrap';
import type { Context } from '../../types';
import type { SubscribeToContextOptions } from '../context-selector';

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

			element.registerConnectedCallback(() => {
				if (
					connectContextSelection(element, context, (value) => applySelectedContext(element, value), {
						select,
						subscribe,
					})
				) {
					return;
				}

				queueMicrotask(() => {
					connectContextSelection(element, context, (value) => applySelectedContext(element, value), {
						select,
						subscribe,
					});
				});
			});
		});

		return descriptor;
	};
}
