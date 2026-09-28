import type { ContextHostLike } from '../../context-host';
import { registerLegacyPostConstructionInitializer } from '../../../decorators/legacy/instance-initializers';
import { bootstrapSsrContextSelection, connectContextSelection } from '../../context-consumer-bootstrap';
import type { Context, ContextType } from '../../types';
import { createContextSelectionDelivery } from '../context-selection-delivery';

export type ContextSelectorFieldOptions<T extends Context<unknown, unknown>, Selected = ContextType<T>> = {
	context: T;
	select?: (context: ContextType<T>) => Selected;
	subscribe?: boolean;
};

export function contextSelectorField<T extends Context<unknown, unknown>, Selected = ContextType<T>>(
	options: ContextSelectorFieldOptions<T, Selected>,
) {
	const { context, select, subscribe = true } = options;

	return (target: ContextHostLike, propertyName: string) => {
		registerLegacyPostConstructionInitializer(target, (element) => {
			let activeUnsubscribe: (() => void) | undefined;
			const applyValue = createContextSelectionDelivery<Selected>(
				element,
				(value) => {
					(element as unknown as Record<string, unknown>)[propertyName] = value;
				},
				true,
			);

			if (bootstrapSsrContextSelection<T, Selected>(element, context, applyValue, select)) {
				return;
			}

			const connectSelection = () =>
				connectContextSelection<T, Selected>(element, context, applyValue, {
					onSubscribe: (unsubscribe) => {
						activeUnsubscribe = unsubscribe;
					},
					select,
					subscribe,
				});

			element.registerCleanupCallback(() => {
				activeUnsubscribe?.();
				activeUnsubscribe = undefined;
			});

			element.registerConnectedCallback(() => {
				if (connectSelection()) {
					return;
				}

				queueMicrotask(() => {
					connectSelection();
				});
			});
		});
	};
}
