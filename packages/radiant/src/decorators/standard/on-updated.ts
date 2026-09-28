import { REACTIVE_HOST, type ReactiveHostInternals } from '../../core/reactive-host';
import type { Method } from '../../types';

type UpdatedHost = {
	readonly [REACTIVE_HOST]: ReactiveHostInternals;
};

export function onUpdated(keyOrKeys: string | string[]) {
	const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];

	return function <THost extends UpdatedHost, T extends Method>(
		originalMethod: T,
		context: ClassMethodDecoratorContext<THost, T>,
	): void {
		context.addInitializer(function (this: THost) {
			const boundMethod = originalMethod.bind(this);

			Object.defineProperty(this, context.name, {
				value: boundMethod,
				configurable: true,
				writable: true,
			});

			this[REACTIVE_HOST].registerUpdatedCallback(keys, boundMethod);
		});
	};
}
