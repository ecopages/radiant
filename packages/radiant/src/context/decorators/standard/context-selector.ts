import type { Method } from '../../../types';
import { initializeContextSelection, requestContextSelection } from '../../context-consumer-runtime';
import type { Context } from '../../types';
import type { SubscribeToContextOptions } from '../context-selector';

export function contextSelector<T extends Context<unknown, unknown>>({
	context,
	select,
	subscribe = true,
}: SubscribeToContextOptions<T>) {
	return function <TMethod extends Method>(
		originalMethod: TMethod,
		targetContext: ClassMethodDecoratorContext<TMethod, TMethod>,
	): void {
		targetContext.addInitializer(function (this: any) {
			if (
				initializeContextSelection(
					context,
					(value) => {
						originalMethod.call(this, value as never);
					},
					select,
				)
			) {
				return;
			}

			queueMicrotask(() => {
				requestContextSelection(this, context, originalMethod.bind(this), { select, subscribe });
			});
		});
	};
}
