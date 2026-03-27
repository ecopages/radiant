import type { Method } from '../../../types';
import { bootstrapSsrContextSelection, connectContextSelection } from '../../context-consumer-bootstrap';
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
		const applySelectedContext = (host: object, value: unknown) => {
			originalMethod.call(host, value as never);
		};

		targetContext.addInitializer(function (this: any) {
			if (bootstrapSsrContextSelection(this, context, (value) => applySelectedContext(this, value), select)) {
				return;
			}

			queueMicrotask(() => {
				connectContextSelection(this, context, originalMethod.bind(this), { select, subscribe });
			});
		});
	};
}
