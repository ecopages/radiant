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
 * decorators. {@link AttrOptions.type} says when `type` is checked.
 *
 * @remarks
 * `T` defaults to `unknown` because legacy decorators have no field type to
 * infer from, and a narrower default would reject valid options such as
 * `defaultValue: 0`. Under legacy decorators `converter.toAttribute` therefore
 * receives `unknown`; pass the whole field type explicitly, as in
 * `@attr<number>(...)` on `count: number`, when it needs the value type.
 */
export function attr<T = unknown>(
	options: AttrOptions<NoInfer<T>> & {
		converter: Required<Pick<AttrConverter<NoInfer<T>>, 'fromAttribute'>>;
	},
): ValueFieldDecorator<ReactiveAttributeHostLike, T>;
export function attr<T = unknown>(
	options?: AttrOptions<NoInfer<T>, AttributeTypeConstantFor<NoInfer<T>>>,
): ValueFieldDecorator<ReactiveAttributeHostLike, T>;
export function attr<T>(options: AttrOptions<T> = {}): ValueFieldDecorator<ReactiveAttributeHostLike, T> {
	return fieldDecorator(standardReactiveAttr(options), legacyReactiveAttr(options));
}
