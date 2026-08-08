/**
 * Hydration binding contract shared by SSR serialization and client recovery.
 *
 * Lifecycle overview:
 * 1. `serializeRenderable(..., { mode: 'hydrate' })` writes `data-radiant-jsx-bind-N`
 *    attributes through {@link takeNextHydrationMarkerIndex} and
 *    {@link resolveHydrationMarkerAttributeName}.
 * 2. {@link collectHydrationBindings} and {@link collectTemplateAttributeMarkerIndices}
 *    resolve the same global namespace for iterable fragment children.
 * 3. `hydrate(...)` walks markers back to live bindings via template, iterable, or flat paths.
 *
 * See `packages/jsx/README.md` → "SSR Marker Lifecycle" for the full walkthrough.
 */
import { isIterableRenderable, isTemplateResultLike } from '../types/renderable-guards.ts';
import type { JsxRenderable, TemplateResultLike } from '../types/index.ts';
import { shouldSkipHydrationSubtree } from './hydration-subtree-policy.ts';
import { getTemplateInterpolationParts, type BindingKind } from '../factory/template-shape.ts';

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

/** Maps template value indexes to global SSR hydration marker indexes. */
export type TemplateAttributeMarkerIndices = {
	indices: ReadonlyMap<number, number>;
	nextIndex: number;
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
 * Records the global SSR marker indexes for every attribute interpolation in
 * `template`, starting at `startIndex`.
 *
 * This mirrors the index advancement performed by `serializeRenderable(...,
 * { mode: 'hydrate' })` and by {@link collectHydrationBindings}, so iterable
 * fragment hydration can resolve per-child markers against the same namespace.
 */
export function collectTemplateAttributeMarkerIndices(
	template: TemplateResultLike,
	startIndex: number,
): TemplateAttributeMarkerIndices {
	const indices = new Map<number, number>();
	const interpolationParts = getTemplateInterpolationParts(template.strings);
	const state = { nextBindingIndex: startIndex };

	for (let index = 0; index < template.values.length; index += 1) {
		const interpolationPart = interpolationParts[index];

		if (interpolationPart?.type === 'attribute') {
			indices.set(index, takeNextHydrationMarkerIndex(state));
		}
	}

	return { indices, nextIndex: state.nextBindingIndex };
}

/** Resolves the DOM attribute name for a global SSR hydration marker index. */
export function resolveHydrationMarkerAttributeName(globalIndex: number): string {
	return `${ATTRIBUTE_BINDING_PREFIX}${globalIndex}`;
}

/**
 * Reserves the next global SSR marker index for one template attribute
 * interpolation during depth-first serialization.
 */
export function takeNextHydrationMarkerIndex(state: { nextBindingIndex: number }): number {
	const index = state.nextBindingIndex;
	state.nextBindingIndex += 1;
	return index;
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

/**
 * Walks the subtree rooted at `target` and invokes `visit` for every attribute
 * whose name starts with {@link ATTRIBUTE_BINDING_PREFIX}.
 *
 * Attributes are iterated in reverse index order so that callers may safely call
 * `removeAttribute` inside `visit` without corrupting the live `NamedNodeMap`.
 */
export function visitHydrationBindingMarkers(
	target: HTMLElement,
	visit: (element: Element, attribute: Attr) => void,
): boolean {
	let foundHydrationMarker = false;
	const walk = (element: Element): void => {
		const attributes = Array.from(element.attributes).filter((attribute) =>
			attribute.name.startsWith(ATTRIBUTE_BINDING_PREFIX),
		);

		for (let index = attributes.length - 1; index >= 0; index -= 1) {
			const attribute = attributes[index];

			if (!attribute) {
				continue;
			}

			foundHydrationMarker = true;
			visit(element, attribute);
		}

		if (element !== target && shouldSkipHydrationSubtree(element.localName)) {
			return;
		}

		const children = element.children;

		for (let index = 0; index < children.length; index += 1) {
			const child = children.item(index);

			if (child) {
				walk(child);
			}
		}
	};

	walk(target);

	return foundHydrationMarker;
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
	if (options.skipNestedCustomElementRoots && shouldSkipHydrationSubtree(template.rootLocalName ?? '')) {
		return;
	}

	const interpolationParts = getTemplateInterpolationParts(template.strings);
	const markerIndices = collectTemplateAttributeMarkerIndices(template, state.nextIndex);
	state.nextIndex = markerIndices.nextIndex;

	for (const [valueIndex, globalIndex] of markerIndices.indices) {
		const interpolationPart = interpolationParts[valueIndex];

		if (interpolationPart?.type === 'attribute') {
			bindings.set(globalIndex, {
				kind: interpolationPart.kind,
				name: interpolationPart.name,
				value: template.values[valueIndex],
			});
		}
	}

	for (let index = 0; index < template.values.length; index += 1) {
		if (interpolationParts[index]?.type !== 'attribute') {
			collectValueBindings(template.values[index] as JsxRenderable, bindings, state, options);
		}
	}
}
