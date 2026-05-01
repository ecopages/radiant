import type { ContextHostLike } from '../../context-host';
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
	return function <Host extends ContextHostLike, TMethod extends (value: Selected) => unknown>(
		originalMethod: TMethod,
		targetContext: ClassMethodDecoratorContext<Host, TMethod>,
	): void {
		targetContext.addInitializer(function (this: Host) {
			let activeUnsubscribe: (() => void) | undefined;
			const applySelectedContext = createContextSelectionDelivery<Selected>(
				this,
				(value) => {
					originalMethod.call(this, value);
				},
				requestUpdate,
			);

			if (bootstrapSsrContextSelection<T, Selected>(this, context, applySelectedContext, select)) {
				return;
			}

			const connectSelection = () => {
				return connectContextSelection<T, Selected>(this, context, applySelectedContext, {
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
	};
}
