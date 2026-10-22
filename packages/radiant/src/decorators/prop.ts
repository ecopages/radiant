import type { PropTransform, ReactivePropertyOptions } from '../core/reactive-prop-core';
import type { AttributeTypeConstantFor } from '../utils/attribute-utils';
import { reactiveProp as legacyReactiveProp } from './legacy/reactive-prop';
import { reactiveProp as standardReactiveProp, type ReactivePropHost } from './standard/reactive-prop';
import { fieldDecorator, type ValueFieldDecorator } from './bridge';

/**
 * Declares a reactive property on a Radiant host.
 *
 * On `RadiantElement`, the property stays aligned with the element attribute
 * channel and can optionally reflect back to markup. On `RadiantController`,
 * the property is exposed through the attached host element as a real JS
 * property so callers can pass objects, arrays, and other non-string values
 * without serializing them into attributes.
 *
 * Every write updates the member state, which notifies `@onUpdated` listeners and
 * keeps JSX bindings in sync. Render invalidation happens through the reactive
 * render path when `render()` reads reactive members.
 *
 * Pass `transform` to override the default attribute type converters and normalize
 * JS property writes (`fromProperty`). On `RadiantController`, only `fromProperty`
 * applies — attribute conversion is an Element Host concern.
 *
 * The declared field type is the property type: `type`, `defaultValue` and
 * `transform` must agree with it, and are checked against it under standard
 * decorators. {@link ReactivePropertyOptions.type} says what the field must be
 * for a given `type`. Legacy decorators never see the field, so there
 * `transform.toAttribute` receives `unknown` unless the type is passed
 * explicitly. An explicit type must be the whole field type, `undefined`
 * included: `@prop<number | undefined>(...)` on `count?: number`.
 */
export function prop<T = unknown>(
	options: ReactivePropertyOptions<NoInfer<T>> & {
		transform: Required<Pick<PropTransform<NoInfer<T>>, 'fromAttribute'>>;
	},
): ValueFieldDecorator<ReactivePropHost<T>, T>;
export function prop<T = unknown>(
	options: ReactivePropertyOptions<NoInfer<T>, AttributeTypeConstantFor<NoInfer<T>>>,
): ValueFieldDecorator<ReactivePropHost<T>, T>;
export function prop<T>(options: ReactivePropertyOptions<T>): ValueFieldDecorator<ReactivePropHost<T>, T> {
	return fieldDecorator(standardReactiveProp(options), legacyReactiveProp(options));
}
