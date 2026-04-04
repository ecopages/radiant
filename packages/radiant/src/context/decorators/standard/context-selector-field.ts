import type { RadiantElement } from '../../../core/radiant-element';
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

	return function <Host extends RadiantElement>(
		_: undefined,
		fieldContext: ClassFieldDecoratorContext<Host, Selected>,
	) {
		const propertyName = String(fieldContext.name);

		fieldContext.addInitializer(function (this: Host) {
			const applyValue = createContextSelectionDelivery(
				this,
				(value) => {
					const record = this as unknown as Record<string, unknown>;
					record[propertyName] = value;
				},
				true,
			);

			if (bootstrapSsrContextSelection(this, context, applyValue, select as any)) {
				return;
			}

			const connectSelection = () => {
				connectContextSelection(this, context, applyValue, {
					select: select as any,
					subscribe,
				});
			};

			this.registerConnectedCallback(() => {
				connectSelection();
			});

			queueMicrotask(connectSelection);
		});

		return function (this: Host, initialValue: Selected) {
			return initialValue;
		};
	};
}
