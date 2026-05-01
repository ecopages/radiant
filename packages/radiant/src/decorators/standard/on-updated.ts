import type { Method } from '../../types';

type UpdatedHost = {
	registerUpdateCallback(key: string, update: (...args: unknown[]) => unknown): () => void;
};

export function onUpdated(keyOrKeys: string | string[]) {
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

			if (Array.isArray(keyOrKeys)) {
				for (const key of keyOrKeys) {
					this.registerUpdateCallback(key, boundMethod);
				}
			} else if (typeof keyOrKeys === 'string') {
				this.registerUpdateCallback(keyOrKeys, boundMethod);
			}
		});
	};
}
