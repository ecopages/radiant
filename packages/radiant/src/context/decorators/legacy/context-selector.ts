import type { RadiantElement } from '../../../core/radiant-element';
import { registerLegacyInstanceInitializer } from '../../../decorators/legacy/instance-initializers';
import { bootstrapSsrContextSelection, connectContextSelection } from '../../context-consumer-bootstrap';
import type { Context, ContextType } from '../../types';
import type { OnContextUpdateOptions } from '../on-context-update';
import { createContextSelectionDelivery } from '../context-selection-delivery';

export function contextSelector<T extends Context<unknown, unknown>, Selected = ContextType<T>>({
	context,
	select,
	subscribe = true,
	requestUpdate = true,
}: OnContextUpdateOptions<T, Selected>) {
	return (proto: RadiantElement, _: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;

		registerLegacyInstanceInitializer(proto, (element) => {
			const applySelectedContext = createContextSelectionDelivery(
				element,
				(value) => {
					originalMethod.call(element, value);
				},
				requestUpdate,
			);

			bootstrapSsrContextSelection(element, context, applySelectedContext, select);

			element.registerConnectedCallback(() => {
				if (
					connectContextSelection(element, context, applySelectedContext, {
						select,
						subscribe,
					})
				) {
					return;
				}

				queueMicrotask(() => {
					connectContextSelection(element, context, applySelectedContext, {
						select,
						subscribe,
					});
				});
			});
		});

		return descriptor;
	};
}
