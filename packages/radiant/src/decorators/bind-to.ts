import type { BindToHost, BindToTarget } from './shared/bind-to';
import { compileBindToTargets } from './shared/bind-to';
import { bindTo as legacyBindTo } from './legacy/bind-to';
import { bindTo as standardBindTo } from './standard/bind-to';
import { fieldDecoratorBridge } from './bridge';

export type { BindToTarget } from './shared/bind-to';

type BindToDecorator<T> = {
	<THost extends BindToHost>(
		protoOrTarget: undefined,
		nameOrContext: ClassFieldDecoratorContext<THost, T>,
	): void;
	(protoOrTarget: BindToHost, nameOrContext: string): void;
};

type BindToInput<T> = BindToTarget<T> | readonly BindToTarget<T>[];

/**
 * Patches existing DOM from a reactive field without a host `render()` tree.
 *
 * Default target is the host element (`this` on `RadiantElement`, `this.element`
 * on `RadiantController`). Pass `ref` or `selector` to patch a descendant.
 * Pass an array to fan one value out to several writes.
 *
 * Use `@onEvent` for DOM events and `@onUpdated` for procedures (focus, timers,
 * joined `aria-describedby`). `@bindTo` only copies field values onto nodes.
 *
 * `map` is typed from the decorated field. Leave the callback parameter
 * unannotated.
 *
 * @param target One write, or a list of writes, driven by the decorated field.
 *
 * @remarks
 * `NoInfer` on the target keeps `T` coming from the field, not from `map`.
 * Overloads (object vs array) restore contextual typing that a `T | T[]`
 * parameter would drop.
 */
export function bindTo<T>(target: BindToTarget<NoInfer<T>>): BindToDecorator<T>;
export function bindTo<T>(targets: readonly BindToTarget<NoInfer<T>>[]): BindToDecorator<T>;
export function bindTo<T>(target: BindToInput<NoInfer<T>>): BindToDecorator<T> {
	const compiled = compileBindToTargets(target as BindToInput<unknown>);

	function decorator<THost extends BindToHost>(
		protoOrTarget: undefined,
		nameOrContext: ClassFieldDecoratorContext<THost, T>,
	): void;
	function decorator(protoOrTarget: BindToHost, nameOrContext: string): void;
	function decorator(
		protoOrTarget: BindToHost | undefined,
		nameOrContext: string | ClassFieldDecoratorContext<BindToHost, T>,
	): void {
		return fieldDecoratorBridge(standardBindTo(compiled), legacyBindTo(compiled), protoOrTarget, nameOrContext);
	}

	return decorator;
}
