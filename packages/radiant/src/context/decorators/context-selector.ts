import type { Method } from '../../types';
import type { ContextHostLike } from '../context-host';
import type { Context, ContextType, UnknownContext } from '../types';
import { contextSelector as legacyContextSelectorMethod } from './legacy/context-selector';
import { contextSelector as standardContextSelectorMethod } from './standard/context-selector';
import { contextSelectorField as legacyContextSelectorField } from './legacy/context-selector-field';
import { contextSelectorField as standardContextSelectorField } from './standard/context-selector-field';

export type ContextSelectorOptions<T extends UnknownContext, Selected = ContextType<T>> = {
	/** Context token to resolve from ancestor providers. */
	context: T;
	/** Optional projection that narrows the resolved context before delivery. */
	select?: (context: ContextType<T>) => Selected;
	/** Whether client-side event-channel subscriptions should stay active after the first value. */
	subscribe?: boolean;
};

type ContextUpdateMethod<Selected> = (value: Selected) => unknown;

type ContextSelectorDecorator<Selected> = {
	<Host extends ContextHostLike>(
		protoOrTarget: undefined,
		nameOrContext: ClassFieldDecoratorContext<Host, Selected>,
	): (this: Host, initialValue: Selected) => Selected;
	<Host extends ContextHostLike, TMethod extends ContextUpdateMethod<Selected>>(
		protoOrTarget: TMethod,
		nameOrContext: ClassMethodDecoratorContext<Host, TMethod>,
	): void;
	(protoOrTarget: ContextHostLike, nameOrContext: string): void;
	(
		protoOrTarget: ContextHostLike,
		nameOrContext: string,
		descriptor: TypedPropertyDescriptor<ContextUpdateMethod<Selected>>,
	): TypedPropertyDescriptor<ContextUpdateMethod<Selected>> | void;
};

/**
 * Subscribes a field or method to the current value, or a selected slice, of a context.
 *
 * **Field form (preferred):** The field holds the latest context value and is
 * updated whenever the provider changes. On `RadiantComponent` hosts, each
 * update schedules `requestUpdate()` automatically so `render()` stays in sync.
 *
 * **Method form (deprecated — use `@onContextUpdate`):** The method is called
 * with the new value on each change.
 *
 * @param options Context subscription configuration.
 */
export function contextSelector<T extends Context<unknown, unknown>, Selected = ContextType<T>>(
	options: ContextSelectorOptions<T, Selected>,
): ContextSelectorDecorator<Selected> {
	function decorator<Host extends ContextHostLike>(
		protoOrTarget: undefined,
		nameOrContext: ClassFieldDecoratorContext<Host, Selected>,
	): (this: Host, initialValue: Selected) => Selected;
	function decorator<Host extends ContextHostLike, TMethod extends ContextUpdateMethod<Selected>>(
		protoOrTarget: TMethod,
		nameOrContext: ClassMethodDecoratorContext<Host, TMethod>,
	): void;
	function decorator(protoOrTarget: ContextHostLike, nameOrContext: string): void;
	function decorator(
		protoOrTarget: ContextHostLike,
		nameOrContext: string,
		descriptor: TypedPropertyDescriptor<ContextUpdateMethod<Selected>>,
	): TypedPropertyDescriptor<ContextUpdateMethod<Selected>> | void;
	function decorator(
		protoOrTarget: ContextHostLike | Method | undefined,
		nameOrContext:
			| string
			| ClassFieldDecoratorContext<ContextHostLike, Selected>
			| ClassMethodDecoratorContext<ContextHostLike, ContextUpdateMethod<Selected>>,
		descriptor?: TypedPropertyDescriptor<ContextUpdateMethod<Selected>>,
	):
		| ((this: ContextHostLike, initialValue: Selected) => Selected)
		| TypedPropertyDescriptor<ContextUpdateMethod<Selected>>
		| void {
		if (typeof nameOrContext === 'object') {
			if (nameOrContext.kind === 'field') {
				if (protoOrTarget !== undefined) {
					throw new TypeError('@contextSelector field decorators require an undefined target');
				}

				return standardContextSelectorField(options)(undefined, nameOrContext);
			}

			if (typeof protoOrTarget !== 'function') {
				throw new TypeError('@contextSelector standard method decorators require a method target');
			}

			return standardContextSelectorMethod(options)(protoOrTarget, nameOrContext);
		}

		if (descriptor) {
			if (typeof protoOrTarget === 'function' || protoOrTarget === undefined) {
				throw new TypeError('@contextSelector legacy method decorators require a host target');
			}

			return legacyContextSelectorMethod(options)(protoOrTarget, nameOrContext, descriptor);
		}

		if (typeof protoOrTarget === 'function' || protoOrTarget === undefined) {
			throw new TypeError('@contextSelector legacy field decorators require a host target');
		}

		return legacyContextSelectorField(options)(protoOrTarget, nameOrContext);
	}

	return decorator;
}
