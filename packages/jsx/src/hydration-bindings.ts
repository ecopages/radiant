import type { JsxRenderable, TemplateResultLike } from './jsx-runtime.ts';
import { isIterableRenderable, isTemplateResultLike } from './renderable-guards.ts';
import { shouldSkipHydrationSubtree } from './hydration-subtree-policy.ts';
import { getTemplateInterpolationParts, type BindingKind } from './template-shape.ts';

export type { BindingKind, TemplateInterpolationPart } from './template-shape.ts';
export { ATTRIBUTE_BINDING_PATTERN, getBindingKind, getTemplateInterpolationParts } from './template-shape.ts';

/** Attribute prefix used for emitted SSR hydration markers. */
export const ATTRIBUTE_BINDING_PREFIX = 'data-radiant-jsx-bind-';

export type HydrationBinding = {
	/** Binding category used by the hydrator. */
	kind: BindingKind;
	/** DOM attribute or property name that should be reconnected. */
	name: string;
	/** Original dynamic value that will be rebound during hydration. */
	value: unknown;
};

type CollectHydrationBindingsOptions = {
	skipNestedCustomElementRoots?: boolean;
};

/**
 * Walks a JSX value tree and records the hydration bindings in SSR encounter
 * order.
 *
 * The resulting map uses the same binding indexes that `renderToString(...,
 * { mode: 'hydrate' })` writes into the HTML, allowing the DOM hydrator to match
 * serialized markers back to their original values.
 *
 * @param value JSX value to inspect.
 * @returns Ordered binding map keyed by hydration binding index.
 */
export function collectHydrationBindings(
	value: JsxRenderable,
	options: CollectHydrationBindingsOptions = {},
): Map<number, HydrationBinding> {
	const bindings = new Map<number, HydrationBinding>();
	const state = { nextIndex: 0 };

	collectValueBindings(value, bindings, state, options);

	return bindings;
}

/**
 * Parses a serialized hydration descriptor back into its binding metadata.
 *
 * @param value Descriptor produced by {@link serializeBindingDescriptor}.
 * @returns Parsed descriptor, or `undefined` when the value is malformed.
 */
export function parseBindingDescriptor(value: string): Pick<HydrationBinding, 'kind' | 'name'> | undefined {
	const separatorIndex = value.indexOf(':');

	if (separatorIndex === -1) {
		return undefined;
	}

	const kind = value.slice(0, separatorIndex) as BindingKind;
	const name = value.slice(separatorIndex + 1);

	if (!name || !['attr', 'bool', 'event', 'native-event', 'prop'].includes(kind)) {
		return undefined;
	}

	return { kind, name };
}

/**
 * Encodes a binding kind and name into the compact descriptor stored in SSR
 * hydration marker attributes.
 *
 * @param kind Binding category to serialize.
 * @param name DOM attribute or property name.
 * @returns Compact descriptor string used in hydration markers.
 */
export function serializeBindingDescriptor(kind: BindingKind, name: string): string {
	return `${kind}:${name}`;
}

function collectValueBindings(
	value: JsxRenderable,
	bindings: Map<number, HydrationBinding>,
	state: { nextIndex: number },
	options: CollectHydrationBindingsOptions,
): void {
	if (value === undefined || value === null || value === false || value === true) {
		return;
	}

	if (isTemplateResultLike(value)) {
		collectTemplateBindings(value, bindings, state, options);
		return;
	}

	if (isIterableRenderable(value)) {
		for (const child of value) {
			collectValueBindings(child as JsxRenderable, bindings, state, options);
		}
	}
}

function collectTemplateBindings(
	template: TemplateResultLike,
	bindings: Map<number, HydrationBinding>,
	state: { nextIndex: number },
	options: CollectHydrationBindingsOptions,
): void {
	if (options.skipNestedCustomElementRoots && isCustomElementTemplateRoot(template)) {
		return;
	}

	const interpolationParts = getTemplateInterpolationParts(template.strings);

	for (let index = 0; index < template.values.length; index += 1) {
		const interpolationPart = interpolationParts[index];

		if (interpolationPart?.type === 'attribute') {
			const bindingValue = template.values[index];

			bindings.set(state.nextIndex, {
				kind: interpolationPart.kind,
				name: interpolationPart.name,
				value: bindingValue,
			});
			state.nextIndex += 1;
			continue;
		}

		collectValueBindings(template.values[index] as JsxRenderable, bindings, state, options);
	}
}

function isCustomElementTemplateRoot(template: TemplateResultLike): boolean {
	const openingSegment = template.strings[0]?.trimStart() ?? '';
	const tagMatch = /^<([a-z][\w.-]*)\b/i.exec(openingSegment);
	const tagName = tagMatch?.[1];

	return tagName !== undefined && shouldSkipHydrationSubtree({ localName: tagName } as Element);
}
