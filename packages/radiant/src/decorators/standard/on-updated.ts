import type { UpdatedCallback } from '../../core/reactive-host';
import type { Method } from '../../types';

type UpdatedHost = {
	registerUpdatedCallback(keys: readonly string[], callback: UpdatedCallback): () => void;
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

			this.registerUpdatedCallback(keys, boundMethod);
		});
	};
}
