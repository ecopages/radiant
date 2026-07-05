import {
	KEYED_VALUE_SYMBOL,
	RADIANT_TEMPLATE_RESULT,
	RADIANT_TEMPLATE_RESULT_FIELD,
	SUBSCRIBABLE_JSX_VALUE_SYMBOL,
} from './types.ts';
import type {
	JsxNodeLike,
	JsxRenderable,
	KeyedJsxValue,
	SerializableTemplateResultLike,
	SignalLike,
	SubscribableJsxValue,
	TemplateResultLike,
} from './types.ts';

/**
 * Type guard that narrows `value` to {@link TemplateResultLike}.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` is a branded Radiant template result with array
 *   `strings` and `values` fields.
 */
export function isTemplateResultLike(value: unknown): value is TemplateResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as { ['_$rType$']?: unknown })['_$rType$'] === RADIANT_TEMPLATE_RESULT &&
		Array.isArray((value as Partial<TemplateResultLike>).strings) &&
		Array.isArray((value as Partial<TemplateResultLike>).values)
	);
}

/**
 * Type guard that narrows `value` to {@link JsxNodeLike}.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` is an object with a `nodeType` property.
 */
export function isJsxNodeLike(value: unknown): value is JsxNodeLike {
	return typeof value === 'object' && value !== null && 'nodeType' in value;
}

/**
 * Returns whether `value` exposes the signal-like `get` / `subscribe` contract.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` is a non-null object with callable `get` and `subscribe`.
 */
export function isSignalLikeValue(value: unknown): value is SignalLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as Partial<SignalLike>).get === 'function' &&
		typeof (value as Partial<SignalLike>).subscribe === 'function'
	);
}

/**
 * Returns whether `value` carries subscribable JSX child metadata.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` carries {@link SUBSCRIBABLE_JSX_VALUE_SYMBOL}.
 */
export function isSubscribableJsxValue(value: unknown): value is SubscribableJsxValue {
	return typeof value === 'object' && value !== null && SUBSCRIBABLE_JSX_VALUE_SYMBOL in value;
}

/**
 * Returns whether a value carries internal keyed-child metadata.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` carries {@link KEYED_VALUE_SYMBOL}.
 */
export function isKeyedJsxValue(value: unknown): value is KeyedJsxValue {
	return typeof value === 'object' && value !== null && KEYED_VALUE_SYMBOL in value;
}

/**
 * Type guard that narrows `value` to a transport-safe template payload shape.
 *
 * @param value Value to inspect.
 * @returns `true` for objects with `strings` and optional `values` arrays.
 */
export function isSerializableTemplateResultLike(value: unknown): value is SerializableTemplateResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		Array.isArray((value as Partial<SerializableTemplateResultLike>).strings) &&
		((value as Partial<SerializableTemplateResultLike>).values === undefined ||
			Array.isArray((value as Partial<SerializableTemplateResultLike>).values))
	);
}

/**
 * Normalizes transported template payloads into the canonical runtime template result shape.
 *
 * @param value Template payload to normalize.
 * @returns A branded {@link TemplateResultLike} with a concrete `values` array.
 */
export function toTemplateResultLike(value: SerializableTemplateResultLike | TemplateResultLike): TemplateResultLike {
	if (isTemplateResultLike(value)) {
		return value;
	}

	return {
		[RADIANT_TEMPLATE_RESULT_FIELD]: RADIANT_TEMPLATE_RESULT,
		rootLocalName: value.rootLocalName,
		ssrIntrinsicProps: value.ssrIntrinsicProps,
		strings: value.strings as TemplateStringsArray,
		values: value.values ?? [],
	};
}

/**
 * Returns `true` when `value` is a non-string iterable object.
 *
 * @remarks Strings are excluded because they are iterable by character but must
 * be treated as atomic text nodes by serializers and the DOM renderer.
 *
 * @param value Value to test.
 */
export function isIterableRenderable(value: unknown): value is Iterable<unknown> {
	return typeof value !== 'string' && typeof value === 'object' && value !== null && Symbol.iterator in value;
}

/**
 * Returns `true` when `value` is an iterable JSX child.
 *
 * @remarks Strings and functions are excluded: strings are atomic text nodes;
 * functions are components, not child iterables.
 *
 * @param value JSX child value to test.
 */
export function isIterableJsxChild(value: JsxRenderable): value is Iterable<JsxRenderable> {
	return typeof value !== 'string' && typeof value !== 'function' && Symbol.iterator in Object(value);
}

/**
 * Resolves keyed, subscribable, and signal wrappers to a concrete snapshot value.
 *
 * @param value Renderable or reactive wrapper to unwrap.
 * @returns The innermost non-reactive value.
 */
export function resolveReactiveSnapshot(value: unknown): unknown {
	if (isSubscribableJsxValue(value)) {
		return resolveReactiveSnapshot(value.getValue());
	}

	if (isSignalLikeValue(value)) {
		return resolveReactiveSnapshot(value.get());
	}

	return value;
}

/**
 * Resolves reactive wrappers for attribute binding-shape decisions during JSX compilation.
 *
 * @param value Attribute value that may be wrapped in a reactive source.
 * @returns The innermost value used to choose attribute vs property binding.
 */
export function resolveBindingShapeValue(value: unknown): unknown {
	if (isSubscribableJsxValue(value)) {
		return resolveBindingShapeValue(value.getValue());
	}

	if (isSignalLikeValue(value)) {
		return resolveBindingShapeValue(value.get());
	}

	return value;
}
