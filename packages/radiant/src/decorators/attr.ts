import type { AttributeTypeConstantFor } from '../utils/attribute-utils';
import { fieldDecorator, type ValueFieldDecorator } from './bridge';
import { reactiveAttr as legacyReactiveAttr } from './legacy/attr';
import { reactiveAttr as standardReactiveAttr } from './standard/attr';
import type { AttrConverter, AttrOptions, ReactiveAttributeHostLike } from './shared/reactive-attr';
export type { AttrConverter, AttrOptions } from './shared/reactive-attr';

/**
 * Declares a reactive field backed by an attribute on the host element.
 *
 * The declared field type is the value type: `type`, `defaultValue` and
 * `converter` must agree with it, and are checked against it under standard
 * decorators. {@link AttrOptions.type} says what the field must be with and
 * without `type`.
 *
 * @remarks
 * Legacy decorators have no field type to infer from. With `type` or
 * `converter.fromAttribute`, `T` defaults to `unknown`, because a narrower
 * default would reject valid options such as `defaultValue: 0`, so
 * `converter.toAttribute` receives `unknown`; pass the whole field type, as in
 * `@attr<number>(...)` on `count: number`, when it needs the value type.
 * Without either, `T` defaults to `string | null | undefined`, and legacy
 * decorators reject only an option that is not a string, such as
 * `defaultValue: 0`.
 *
 * The overload without `type` constrains `T` to `string | null | undefined`
 * instead of requiring `type` for other fields, so a field typed by a type
 * parameter of a generic host, such as `value: V extends string`, still fits.
 * The cost is the error: a `count: number` field reports that `number` is not
 * assignable to `string`, not that `type: Number` is missing.
 */
export function attr<T = unknown>(
	options: AttrOptions<NoInfer<T>> & {
		converter: Required<Pick<AttrConverter<NoInfer<T>>, 'fromAttribute'>>;
	},
): ValueFieldDecorator<ReactiveAttributeHostLike, T>;
export function attr<T extends string | null | undefined = string | null | undefined>(
	options?: AttrOptions<NoInfer<T>> & { type?: undefined },
): ValueFieldDecorator<ReactiveAttributeHostLike, T>;
export function attr<T = unknown>(
	options: AttrOptions<NoInfer<T>, AttributeTypeConstantFor<NoInfer<T>>> & {
		type: AttributeTypeConstantFor<NoInfer<T>>;
	},
): ValueFieldDecorator<ReactiveAttributeHostLike, T>;
export function attr<T>(options: AttrOptions<T> = {}): ValueFieldDecorator<ReactiveAttributeHostLike, T> {
	return fieldDecorator(standardReactiveAttr(options), legacyReactiveAttr(options));
}
