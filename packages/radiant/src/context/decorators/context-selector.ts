import type {
	LegacyFieldDecoratorArgs,
	LegacyMethodDecoratorArgs,
	Method,
	StandardFieldDecoratorArgs,
	StandardMethodDecoratorArgs,
} from '../../types';
import type { RadiantElement } from '../../core/radiant-element';
import type { Context, ContextType, UnknownContext } from '../types';
import type { OnContextUpdateOptions } from './on-context-update';
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

/**
 * @deprecated Use `ContextSelectorOptions` for field usage or `OnContextUpdateOptions` for method usage.
 */
export type SubscribeToContextOptions<T extends UnknownContext> = OnContextUpdateOptions<T>;

type ContextUpdateMethod<Selected> = (value: Selected) => unknown;

type ContextSelectorDecorator<Selected> = {
	<Host extends RadiantElement>(
		protoOrTarget: undefined,
		nameOrContext: ClassFieldDecoratorContext<Host, Selected>,
	): (this: Host, initialValue: Selected) => Selected;
	<Host extends RadiantElement, TMethod extends ContextUpdateMethod<Selected>>(
		protoOrTarget: TMethod,
		nameOrContext: ClassMethodDecoratorContext<Host, TMethod>,
	): void;
	(protoOrTarget: RadiantElement, nameOrContext: string): void;
	(
		protoOrTarget: RadiantElement,
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
	return function (
		protoOrTarget: RadiantElement | Method | undefined,
		nameOrContext:
			| string
			| ClassFieldDecoratorContext<RadiantElement, Selected>
			| ClassMethodDecoratorContext<RadiantElement, ContextUpdateMethod<Selected>>,
		descriptor?: TypedPropertyDescriptor<ContextUpdateMethod<Selected>>,
	):
		| ((this: RadiantElement, initialValue: Selected) => Selected)
		| TypedPropertyDescriptor<ContextUpdateMethod<Selected>>
		| void {
		if (typeof nameOrContext === 'object') {
			if (nameOrContext.kind === 'field') {
				return standardContextSelectorField(options)(
					protoOrTarget as StandardFieldDecoratorArgs<RadiantElement, Selected>['protoOrTarget'],
					nameOrContext as StandardFieldDecoratorArgs<RadiantElement, Selected>['nameOrContext'],
				);
			}

			return standardContextSelectorMethod(options as OnContextUpdateOptions<T, Selected>)(
				protoOrTarget as StandardMethodDecoratorArgs['protoOrTarget'],
				nameOrContext as StandardMethodDecoratorArgs['nameOrContext'],
			);
		}

		if (descriptor) {
			return legacyContextSelectorMethod(options as OnContextUpdateOptions<T, Selected>)(
				protoOrTarget as LegacyMethodDecoratorArgs['protoOrTarget'],
				nameOrContext as LegacyMethodDecoratorArgs['nameOrContext'],
				descriptor as LegacyMethodDecoratorArgs['descriptor'],
			);
		}

		return legacyContextSelectorField(options)(
			protoOrTarget as LegacyFieldDecoratorArgs['protoOrTarget'],
			nameOrContext as LegacyFieldDecoratorArgs['nameOrContext'],
		);
	} as ContextSelectorDecorator<Selected>;
}
