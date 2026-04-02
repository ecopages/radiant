import {
	isKeyedJsxValue,
	isSubscribableJsxValue,
	type KeyedJsxValue,
	type SignalLike,
	type TemplateResultLike,
} from '../jsx-runtime.ts';
import { createNodesFromJsxNodeLike, isJsxNodeLike } from './dom-operations.ts';
import type { DeferredPropertyBinding, ReactiveAttributeSource, ReactiveChildSource } from './types.ts';

type TemplateMount = (
	template: TemplateResultLike,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	contextParent?: Node | null,
) => { rootNodes: readonly Node[] };

/**
 * Flushes property assignments after the DOM structure for the current pass is stable.
 *
 * Property writes are deferred so custom elements or other property-sensitive
 * nodes see the final DOM shape before receiving their bound values.
 */
export function flushDeferredProperties(bindings: DeferredPropertyBinding[]): void {
	for (const binding of bindings) {
		(binding.element as unknown as Record<string, unknown>)[binding.name] = binding.value;
	}
}

/** Removes keyed-child wrapper metadata so downstream logic can work with the raw child value. */
export function unwrapKeyedValue(value: unknown): unknown {
	return isKeyedJsxValue(value) ? value.value : value;
}

/**
 * Materializes an arbitrary JSX child value into concrete DOM nodes.
 *
 * This is the escape hatch used when the renderer cannot update in place or
 * when it needs an exact node-count estimate for hydration planning.
 */
export function createNodesFromValue(
	value: unknown,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	mountTemplate: TemplateMount,
	contextParent: Node | null = rootTarget,
): Node[] {
	const nextValue = unwrapKeyedValue(value);

	if (nextValue === undefined || nextValue === null || nextValue === false || nextValue === true) {
		return [];
	}

	if (isSubscribableJsxValue(nextValue)) {
		return createNodesFromValue(nextValue.getValue(), rootTarget, deferredProperties, mountTemplate, contextParent);
	}

	if (isTemplateResultLike(nextValue)) {
		return [...mountTemplate(nextValue, rootTarget, deferredProperties, contextParent).rootNodes];
	}

	if (isJsxNodeLike(nextValue)) {
		return createNodesFromJsxNodeLike(nextValue);
	}

	if (nextValue instanceof Node) {
		return [nextValue];
	}

	if (isIterableValue(nextValue)) {
		const nodes: Node[] = [];

		for (const child of nextValue) {
			nodes.push(...createNodesFromValue(child, rootTarget, deferredProperties, mountTemplate, contextParent));
		}

		return nodes;
	}

	return [document.createTextNode(String(nextValue))];
}

/**
 * Returns `true` when `value` can be rendered as a single DOM text node.
 *
 * Primitive types that have a meaningful string representation qualify;
 * `false` intentionally does NOT qualify — it renders as nothing, not the
 * string `"false"`. `true` is excluded because JSX child semantics treat it as
 * an empty render, matching the SSR serializer.
 *
 * @param value Value to test.
 */
export function canRenderAsTextNode(value: unknown): value is bigint | boolean | number | string {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint';
}

/**
 * Returns the value as an array of {@link KeyedJsxValue} entries when every element of
 * an iterable carries a key, otherwise returns `undefined`.
 *
 * A single non-keyed child in an otherwise keyed list causes the whole list to be
 * downgraded to indexed mode.
 *
 * @param children Materialized iterable children to inspect.
 */
export function getKeyedChildren(children: readonly unknown[]): KeyedJsxValue[] | undefined {
	const keyedChildren: KeyedJsxValue[] = [];

	for (const child of children) {
		if (!isKeyedJsxValue(child)) {
			return undefined;
		}

		keyedChildren.push(child);
	}

	return keyedChildren;
}

/**
 * Returns the value materialised as a plain array when it is an iterable,
 * otherwise returns `undefined`.
 *
 * @param value Value to inspect.
 */
export function getIterableChildren(value: unknown): unknown[] | undefined {
	if (!isIterableValue(value)) {
		return undefined;
	}

	return Array.from(value);
}

/**
 * Returns `true` when `value` is a non-string iterable object.
 *
 * Strings are excluded because they are iterable by character but must be
 * treated as atomic text nodes by the renderer.
 *
 * @param value Value to test.
 */
export function isIterableValue(value: unknown): value is Iterable<unknown> {
	return typeof value !== 'string' && typeof value === 'object' && value !== null && Symbol.iterator in value;
}

/**
 * Type guard that narrows `value` to {@link TemplateResultLike}.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` is a valid Radiant template result.
 */
export function isTemplateResultLike(value: unknown): value is TemplateResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as { ['_$rType$']?: unknown })['_$rType$'] === 1 &&
		'strings' in value &&
		'values' in value
	);
}

export function isReactiveAttributeSource(value: unknown): value is ReactiveAttributeSource {
	return isReactiveChildSource(value);
}

export function isReactiveChildSource(value: unknown): value is ReactiveChildSource {
	return isSubscribableJsxValue(value) || isSignalLikeValue(value);
}

export function isSignalLikeValue(value: unknown): value is SignalLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as Partial<SignalLike>).get === 'function' &&
		typeof (value as Partial<SignalLike>).subscribe === 'function'
	);
}

export function readReactiveChildSourceValue(source: ReactiveChildSource): unknown {
	return isSubscribableJsxValue(source) ? source.getValue() : source.get();
}

export function subscribeToReactiveChildSource(
	source: ReactiveChildSource,
	notify: (value: unknown) => void,
): () => void {
	return isSubscribableJsxValue(source) ? source.subscribe((value) => notify(value)) : source.subscribe(notify);
}

export function resolveReactiveSnapshot(value: unknown): unknown {
	if (isSubscribableJsxValue(value)) {
		return resolveReactiveSnapshot(value.getValue());
	}

	if (isSignalLikeValue(value)) {
		return resolveReactiveSnapshot(value.get());
	}

	return value;
}
