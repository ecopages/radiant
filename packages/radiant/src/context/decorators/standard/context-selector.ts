import type { Method } from '../../../types';
import { ContextSubscriptionRequestEvent } from '../../events';
import type { Context } from '../../types';
import type { SubscribeToContextOptions } from '../context-selector';

export function contextSelector<T extends Context<unknown, unknown>>({
	context,
	select,
	subscribe = true,
}: SubscribeToContextOptions<T>) {
	return function <T extends Method>(originalMethod: T, targetContext: ClassMethodDecoratorContext<T, T>): void {
		targetContext.addInitializer(function (this: any) {
			queueMicrotask(() => {
				this.dispatchEvent(
					new ContextSubscriptionRequestEvent(context, originalMethod.bind(this), select, subscribe),
				);
			});
		});
	};
}
