import type { Method } from '../../../types';
import type { RadiantElement } from '../../../core/radiant-element';
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
	return function <Host extends RadiantElement, TMethod extends Method>(
		originalMethod: TMethod,
		targetContext: ClassMethodDecoratorContext<Host, TMethod>,
	): void {
		targetContext.addInitializer(function (this: Host) {
			const applySelectedContext = createContextSelectionDelivery(
				this,
				(value) => {
					originalMethod.call(this, value as never);
				},
				requestUpdate,
			);

			if (bootstrapSsrContextSelection(this, context, applySelectedContext, select)) {
				return;
			}

			const connectSelection = () => {
				connectContextSelection(this, context, applySelectedContext, {
					select,
					subscribe,
				});
			};

			this.registerConnectedCallback(() => {
				connectSelection();
			});

			queueMicrotask(connectSelection);
		});
	};
}
