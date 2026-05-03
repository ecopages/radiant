import type { RadiantElement } from '../../../core/radiant-element';
import { registerLegacyInstanceInitializer } from '../../../decorators/legacy/instance-initializers';
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

	return (target: RadiantElement, propertyName: string) => {
		registerLegacyInstanceInitializer(target, (element) => {
			const applyValue = createContextSelectionDelivery(
				element,
				(value) => {
					(element as unknown as Record<string, unknown>)[propertyName] = value as Selected;
				},
				true,
			);

			bootstrapSsrContextSelection(element, context, applyValue, select as any);

			element.registerConnectedCallback(() => {
				if (
					connectContextSelection(element, context, applyValue, {
						select: select as any,
						subscribe,
					})
				) {
					return;
				}

				queueMicrotask(() => {
					connectContextSelection(element, context, applyValue, {
						select: select as any,
						subscribe,
					});
				});
			});
		});
	};
}
