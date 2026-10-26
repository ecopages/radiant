import type { ContextHostLike } from '../context-host';
import type { Context, ContextType, UnknownContext } from '../types';
import { contextSelectorField as legacyContextSelectorField } from './legacy/context-selector-field';
import { contextSelectorField as standardContextSelectorField } from './standard/context-selector-field';
import { fieldDecoratorBridge } from '../../decorators/bridge';

export type ContextSelectorOptions<T extends UnknownContext, Selected = ContextType<T>> = {
	/** Context token to resolve from ancestor providers. */
	context: T;
	/** Optional projection that narrows the resolved context before delivery. */
	select?: (context: ContextType<T>) => Selected;
	/** Whether client-side event-channel subscriptions should stay active after the first value. */
	subscribe?: boolean;
};

/**
 * `BoundedFieldDecorator<ContextHostLike, unknown, Selected>` with a third legacy parameter.
 *
 * @remarks
 * TypeScript hands a legacy method decorator its descriptor only when the signature declares a third
 * parameter, so `descriptor?: undefined` is what makes a method target fail to type-check in legacy mode.
 * The legacy overload comes first for the same reason as in `BoundedFieldDecorator`.
 */
type ContextSelectorDecorator<Selected> = {
	(protoOrTarget: ContextHostLike, name: string, descriptor?: undefined): void;
	<THost extends ContextHostLike, V>(
		target: undefined,
		context: ClassFieldDecoratorContext<THost, V> & {
			readonly access: { readonly set: (object: never, value: Selected) => void };
		},
	): void;
};

/**
 * Subscribes a field to the current value, or a selected slice, of a context.
 *
 * The field holds the latest context value and is updated whenever the provider changes. On
 * `RadiantElement` hosts, each update schedules `requestUpdate()` automatically so `render()` stays in sync.
 *
 * @remarks
 * `Selected` comes from `select`, or is the context's value without it. The returned decorator takes it
 * through `NoInfer`, so a field without `select` cannot choose `Selected` for itself: under standard
 * decorators the field has to be able to hold the selected value, or it is rejected. It can be optional,
 * which holds `undefined` until the first delivery, or wider than the selection.
 *
 * Applied to anything but a field, such as a method, it throws a `TypeError` that names
 * `@onContextUpdate`, the decorator for a method. A legacy decorator call is a method or accessor when it
 * receives a property descriptor.
 */
export function contextSelector<T extends Context<unknown, unknown>, Selected = ContextType<T>>(
	options: ContextSelectorOptions<T, Selected>,
): ContextSelectorDecorator<NoInfer<Selected>> {
	return (
		protoOrTarget: ContextHostLike | undefined,
		nameOrContext: string | ClassFieldDecoratorContext<ContextHostLike, unknown>,
		descriptor?: PropertyDescriptor,
	) => {
		if (descriptor !== undefined || (typeof nameOrContext === 'object' && nameOrContext.kind !== 'field')) {
			throw new TypeError(
				'@contextSelector decorates a field only. Use @onContextUpdate to run a method when the context changes.',
			);
		}

		fieldDecoratorBridge(
			standardContextSelectorField(options),
			legacyContextSelectorField(options),
			protoOrTarget,
			nameOrContext,
		);
	};
}
