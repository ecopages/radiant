import type { Method } from '../../types';
import type { ContextHostLike } from '../context-host';
import type { Context, ContextType, UnknownContext } from '../types';
import { contextSelector as legacyContextSelectorMethod } from './legacy/context-selector';
import { contextSelector as standardContextSelectorMethod } from './standard/context-selector';
import { methodDecoratorBridge } from '../../decorators/bridge';

type ContextUpdateMethod<Selected> = (value: Selected) => unknown;

type OnContextUpdateDecorator<Selected> = {
	<Host extends ContextHostLike, TMethod extends ContextUpdateMethod<Selected>>(
		protoOrTarget: TMethod,
		nameOrContext: ClassMethodDecoratorContext<Host, TMethod>,
	): void;
	(
		protoOrTarget: ContextHostLike,
		nameOrContext: string,
		descriptor: TypedPropertyDescriptor<ContextUpdateMethod<Selected>>,
	): TypedPropertyDescriptor<ContextUpdateMethod<Selected>> | void;
};

export type OnContextUpdateOptions<T extends UnknownContext, Selected = ContextType<T>> = {
	/** Context token to resolve from ancestor providers. */
	context: T;
	/** Optional projection that narrows the resolved context before delivery. */
	select?: (context: ContextType<T>) => Selected;
	/** Whether client-side event-channel subscriptions should stay active after the first value. */
	subscribe?: boolean;
	/** Whether RadiantComponent hosts should schedule `requestUpdate()` after delivery. */
	requestUpdate?: boolean;
};

/**
 * Subscribes a method to the current value, or a selected slice, of a context.
 *
 * The decorated method is invoked during SSR when an ambient provider is
 * available, and on the client it keeps receiving updates according to the
 * `subscribe` option.
 *
 * On `RadiantComponent` hosts, each delivery also schedules `requestUpdate()`
 * unless `requestUpdate: false` is set explicitly.
 *
 * @param options Context subscription configuration.
 */
export function onContextUpdate<T extends Context<unknown, unknown>, Selected = ContextType<T>>(
	options: OnContextUpdateOptions<T, Selected>,
): OnContextUpdateDecorator<Selected> {
	function decorator<Host extends ContextHostLike, TMethod extends ContextUpdateMethod<Selected>>(
		protoOrTarget: TMethod,
		nameOrContext: ClassMethodDecoratorContext<Host, TMethod>,
	): void;
	function decorator(
		protoOrTarget: ContextHostLike,
		nameOrContext: string,
		descriptor: TypedPropertyDescriptor<ContextUpdateMethod<Selected>>,
	): TypedPropertyDescriptor<ContextUpdateMethod<Selected>> | void;
	function decorator(
		protoOrTarget: ContextHostLike | Method,
		nameOrContext: string | ClassMethodDecoratorContext<ContextHostLike, ContextUpdateMethod<Selected>>,
		descriptor?: TypedPropertyDescriptor<ContextUpdateMethod<Selected>>,
	): TypedPropertyDescriptor<ContextUpdateMethod<Selected>> | void {
		return methodDecoratorBridge(
			standardContextSelectorMethod(options),
			legacyContextSelectorMethod(options),
			protoOrTarget,
			nameOrContext,
			descriptor,
		);
	}

	return decorator;
}
