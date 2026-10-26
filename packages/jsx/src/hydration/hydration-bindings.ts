/**
 * Hydration binding contract shared by SSR serialization and client recovery.
 *
 * Lifecycle overview:
 * 1. `serializeRenderable(..., { mode: 'hydrate' })` writes `data-radiant-jsx-bind-N`
 *    attributes through {@link takeNextHydrationMarkerIndex} and
 *    {@link resolveHydrationMarkerAttributeName}.
 * 2. {@link planTemplateHydrationIndices} resolves the same global namespace for
 *    nested templates and list children.
 * 3. `hydrate(...)` walks markers back to live bindings via the template or iterable path.
 *
 * See `packages/jsx/README.md` → "SSR Marker Lifecycle" for the full walkthrough.
 */
import { isIterableRenderable, isTemplateResultLike } from '../types/renderable-guards.ts';
import type { JsxRenderable, TemplateResultLike } from '../types/index.ts';
import { isCustomElementSubtreeRoot } from './hydration-subtree-policy.ts';
import type { BindingKind } from '../types/renderable-types.ts';
import { materializeIterableChildren } from './iterable-snapshot.ts';

/** Attribute prefix used for emitted SSR hydration markers. */
export const ATTRIBUTE_BINDING_PREFIX = 'data-radiant-jsx-bind-';

export type HydrationBinding = {
	/** Binding category used by the hydrator. */
	kind: BindingKind;
	/** DOM attribute or property name that should be reconnected. */
	name: string;
};

/**
 * Placement of one template's interpolation slots within the global SSR marker
 * namespace.
 *
 * Both maps are keyed by template value index: `attributeIndices` gives the marker
 * index written into the DOM, `childBaseIndices` gives the index a child's own
 * subtree starts at.
 */
export type TemplateHydrationIndexPlan = {
	attributeIndices: ReadonlyMap<number, number>;
	childBaseIndices: ReadonlyMap<number, number>;
	nextIndex: number;
};

/**
 * Counts the SSR marker indexes that `value` and everything beneath it consume.
 *
 * Used to skip a nested subtree's slice of the global namespace when a caller
 * needs the index a later sibling starts at.
 *
 * @remarks
 * A hyphenated template is a custom-element subtree root and contributes
 * nothing to the parent namespace. Counting it would shift every later marker.
 */
export function countHydrationMarkers(value: JsxRenderable): number {
	if (value === undefined || value === null || value === false || value === true) {
		return 0;
	}

	if (isTemplateResultLike(value)) {
		if (isCustomElementSubtreeRoot(value.rootLocalName ?? '')) {
			return 0;
		}

		let total = 0;

		for (let index = 0; index < value.values.length; index += 1) {
			total +=
				value.parts[index]?.type === 'attribute'
					? 1
					: countHydrationMarkers(value.values[index] as JsxRenderable);
		}

		return total;
	}

	if (isIterableRenderable(value)) {
		let total = 0;

		for (const child of materializeIterableChildren(value)) {
			total += countHydrationMarkers(child as JsxRenderable);
		}

		return total;
	}

	return 0;
}

/**
 * Maps one template's interpolation slots onto the global SSR marker namespace,
 * starting at `startIndex`.
 *
 * Mirrors the index advancement in `serializeRenderable(..., { mode: 'hydrate' })`:
 * slots are visited in value order, an attribute consumes exactly one index, and a
 * child consumes however many its whole subtree emitted. Hydration can therefore
 * resolve a nested template's markers without having walked the tree in DOM order.
 *
 * @param template Template whose slots are being placed.
 * @param startIndex First global index owned by this template.
 */
export function planTemplateHydrationIndices(
	template: TemplateResultLike,
	startIndex: number,
): TemplateHydrationIndexPlan {
	const attributeIndices = new Map<number, number>();
	const childBaseIndices = new Map<number, number>();
	const state = { nextBindingIndex: startIndex };

	for (let index = 0; index < template.values.length; index += 1) {
		if (template.parts[index]?.type === 'attribute') {
			attributeIndices.set(index, takeNextHydrationMarkerIndex(state));
			continue;
		}

		childBaseIndices.set(index, state.nextBindingIndex);
		state.nextBindingIndex += countHydrationMarkers(template.values[index] as JsxRenderable);
	}

	return { attributeIndices, childBaseIndices, nextIndex: state.nextBindingIndex };
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
 *
 * @param intoCustomElements Also walk nested custom elements, whose markers belong to their own namespaces.
 *
 * @remarks
 * Incomplete SSR DOM shims may omit a real `NamedNodeMap`/`HTMLCollection`. Those
 * hosts have no Attr markers to recover, so the walk is a no-op.
 */
export function visitHydrationBindingMarkers(
	target: HTMLElement,
	visit: (element: Element, attribute: Attr) => void,
	intoCustomElements = false,
): boolean {
	if (!isNamedNodeMapLike(target.attributes)) {
		return false;
	}

	let foundHydrationMarker = false;
	const walk = (element: Element): void => {
		const attributes = listHydrationBindingAttributes(element);

		for (let index = attributes.length - 1; index >= 0; index -= 1) {
			const attribute = attributes[index];

			if (!attribute) {
				continue;
			}

			foundHydrationMarker = true;
			visit(element, attribute);
		}

		if (!intoCustomElements && element !== target && isCustomElementSubtreeRoot(element.localName)) {
			return;
		}

		const children = element.children;

		for (let index = 0; index < children.length; index += 1) {
			const child = getChildElementAt(children, index);

			if (child) {
				walk(child);
			}
		}
	};

	walk(target);

	return foundHydrationMarker;
}

/**
 * Collects Attr nodes that carry hydration markers on `element`.
 *
 * @remarks
 * Requires a real `NamedNodeMap`-shaped `attributes` list. Map-backed SSR shims
 * and missing attribute bags are treated as empty — calling `Array.from` on a
 * `Map` would otherwise yield `[name, value]` tuples and crash on `.name`.
 */
function listHydrationBindingAttributes(element: Element): Attr[] {
	const namedAttributes = element.attributes;

	if (!isNamedNodeMapLike(namedAttributes)) {
		return [];
	}

	const markers: Attr[] = [];

	for (let index = 0; index < namedAttributes.length; index += 1) {
		const attribute = namedAttributes.item(index) ?? namedAttributes[index];

		if (attribute && typeof attribute.name === 'string' && attribute.name.startsWith(ATTRIBUTE_BINDING_PREFIX)) {
			markers.push(attribute);
		}
	}

	return markers;
}

function isNamedNodeMapLike(value: NamedNodeMap | undefined | null): value is NamedNodeMap {
	return Boolean(value && typeof value.length === 'number' && typeof value.item === 'function');
}

function getChildElementAt(children: HTMLCollection, index: number): Element | null {
	if (typeof children.item === 'function') {
		return children.item(index);
	}

	return (children as unknown as ArrayLike<Element | null | undefined>)[index] ?? null;
}
