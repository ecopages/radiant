import type { ContextHostLike } from '../../context-host';
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

	return function <Host extends ContextHostLike>(
		_: undefined,
		fieldContext: ClassFieldDecoratorContext<Host, Selected>,
	) {
		const propertyName = String(fieldContext.name);

		fieldContext.addInitializer(function (this: Host) {
			let activeUnsubscribe: (() => void) | undefined;
			const applyValue = createContextSelectionDelivery<Selected>(
				this,
				(value) => {
					const record = this as unknown as Record<string, unknown>;
					record[propertyName] = value;
				},
				true,
			);

			if (bootstrapSsrContextSelection<T, Selected>(this, context, applyValue, select)) {
				return;
			}

			const connectSelection = () => {
				return connectContextSelection<T, Selected>(this, context, applyValue, {
					onSubscribe: (unsubscribe) => {
						activeUnsubscribe = unsubscribe;
					},
					select,
					subscribe,
				});
			};

			this.registerCleanupCallback(() => {
				activeUnsubscribe?.();
				activeUnsubscribe = undefined;
			});

			this.registerConnectedCallback(() => {
				if (connectSelection()) {
					return;
				}

				queueMicrotask(() => {
					connectSelection();
				});
			});
		});

		return function (this: Host, initialValue: Selected) {
			return initialValue;
		};
	};
}
