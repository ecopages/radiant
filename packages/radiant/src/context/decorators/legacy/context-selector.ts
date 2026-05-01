import type { ContextHostLike } from '../../context-host';
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
	return (proto: ContextHostLike, _: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;

		registerLegacyInstanceInitializer(proto, (element) => {
			let activeUnsubscribe: (() => void) | undefined;
			const applySelectedContext = createContextSelectionDelivery(
				element,
				(value) => {
					originalMethod.call(element, value);
				},
				requestUpdate,
			);

			bootstrapSsrContextSelection<T, Selected>(element, context, applySelectedContext, select);

			element.registerConnectedCallback(() => {
				if (
					connectContextSelection<T, Selected>(element, context, applySelectedContext, {
						onSubscribe: (unsubscribe) => {
							activeUnsubscribe = unsubscribe;
						},
						select,
						subscribe,
					})
				) {
					return;
				}

				queueMicrotask(() => {
					connectContextSelection<T, Selected>(element, context, applySelectedContext, {
						onSubscribe: (unsubscribe) => {
							activeUnsubscribe = unsubscribe;
						},
						select,
						subscribe,
					});
				});
			});

			element.registerCleanupCallback(() => {
				activeUnsubscribe?.();
				activeUnsubscribe = undefined;
			});
		});

		return descriptor;
	};
}
