import type { BindToHost, BindToTarget, BindToValue } from './shared/bind-to';
import { compileBindToTargets } from './shared/bind-to';
import { bindTo as legacyBindTo } from './legacy/bind-to';
import { bindTo as standardBindTo } from './standard/bind-to';
import { fieldDecorator, type ValueFieldDecorator } from './bridge';

export type { BindToTarget } from './shared/bind-to';

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
 * Under standard decorators `map` is typed from the decorated field: leave the
 * callback parameter unannotated. It receives the field value, so on a
 * `@signal` field declared `WritableSignal<number>` it receives the `number`.
 * Legacy decorators (`experimentalDecorators`) never see the field type, so
 * `map` receives `unknown` and nothing is checked against the field: pass the
 * whole field type, `undefined` included, as a type argument, as in
 * `@bindTo<number>({ attr: 'data-n', map: (v) => v.toFixed() })` or
 * `@bindTo<WritableSignal<number>>(...)` on a `@signal` field.
 *
 * @param target One write, or a list of writes, driven by the decorated field.
 *
 * @remarks
 * `NoInfer` on the target keeps `T` coming from the field, not from `map`.
 * Overloads (object vs array) restore contextual typing that a `T | T[]`
 * parameter would drop.
 */
export function bindTo<T>(target: BindToTarget<NoInfer<BindToValue<T>>>): ValueFieldDecorator<BindToHost, T>;
export function bindTo<T>(
	targets: readonly BindToTarget<NoInfer<BindToValue<T>>>[],
): ValueFieldDecorator<BindToHost, T>;
export function bindTo<T>(target: BindToInput<NoInfer<BindToValue<T>>>): ValueFieldDecorator<BindToHost, T> {
	const compiled = compileBindToTargets(target as BindToInput<unknown>);

	return fieldDecorator<BindToHost, T>(standardBindTo(compiled), legacyBindTo(compiled));
}
