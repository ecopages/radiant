import type { REACTIVE_HOST, ReactiveHostInternals } from '../core/reactive-host';
import type { Method } from '../types';
import { onUpdated as legacyOnUpdated } from './legacy/on-updated';
import { onUpdated as standardOnUpdated } from './standard/on-updated';
import { methodDecoratorBridge } from './bridge';

type UpdatedHost = {
	readonly [REACTIVE_HOST]: ReactiveHostInternals;
};

/**
 * Runs the decorated method once per update cycle when any of the named reactive members changed.
 *
 * @param keyOrKeys - Member names that trigger the method.
 *
 * @remarks
 * Writes in the same turn batch into one cycle (a microtask), so a method
 * watching several members runs once with all of them applied. It receives the
 * set of members changed in the cycle, runs before the render commit, and
 * nothing runs before the host connects (SSR runs pending callbacks before
 * serializing). Use `updated()` for work that needs the committed DOM.
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
