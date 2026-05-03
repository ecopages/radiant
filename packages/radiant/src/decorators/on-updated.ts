import type { Method } from '../types';
import { onUpdated as legacyOnUpdated } from './legacy/on-updated';
import { onUpdated as standardOnUpdated } from './standard/on-updated';
import { methodDecoratorBridge } from './bridge';

type UpdateCallback = (...args: unknown[]) => unknown;

type UpdatedHost = {
	registerCleanupCallback(callback: () => void): void;
	registerConnectedCallback(callback: () => void): void;
	registerUpdateCallback(key: string, update: UpdateCallback): () => void;
};

/**
 * A decorator to bind a method to the instance.
 */
export function onUpdated(keyOrKeys: string | string[]) {
	function decorator<THost extends UpdatedHost, TMethod extends Method>(
		protoOrTarget: TMethod,
		nameOrContext: ClassMethodDecoratorContext<THost, TMethod>,
	): void;
	function decorator(
		protoOrTarget: UpdatedHost,
		nameOrContext: string,
		descriptor: TypedPropertyDescriptor<Method>,
	): TypedPropertyDescriptor<Method> | void;
	function decorator(
		protoOrTarget: UpdatedHost | Method,
		nameOrContext: string | ClassMethodDecoratorContext<UpdatedHost, Method>,
		descriptor?: TypedPropertyDescriptor<Method>,
	): TypedPropertyDescriptor<Method> | void {
		return methodDecoratorBridge(
			standardOnUpdated(keyOrKeys),
			legacyOnUpdated(keyOrKeys),
			protoOrTarget,
			nameOrContext,
			descriptor,
		);
	}

	return decorator;
}
