import { shouldDelegateEventBinding } from './event-binding-policy.ts';
import { getTemplateShapeKey } from './template-shape.ts';
import { forEachNormalizedAttribute } from './attribute-normalize.ts';
import { shouldUseAttributeBindingByDefaultForElement, shouldUseBooleanAttributeBinding } from './binding-defaults.ts';
import { isIterableJsxChild, resolveReactiveSnapshot } from '../types/renderable-guards.ts';
import {
	KEYED_VALUE_SYMBOL,
	RADIANT_MARKUP_NODE_SYMBOL,
	RADIANT_TEMPLATE_RESULT,
	RADIANT_TEMPLATE_RESULT_FIELD,
	SLOT_JSX_VALUE_SYMBOL,
} from '../types/index.ts';
import type {
	JsxComponent,
	JsxNodeLike,
	JsxPropsWithChildren,
	JsxRenderable,
	SlotJsxValue,
	TemplatePartDescriptor,
	TemplateResultLike,
} from '../types/index.ts';

/** Well-known symbol that identifies a JSX fragment in the Radiant runtime. */
declare const fragmentSymbolType: unique symbol;
export const fragmentSymbol = Symbol.for('@ecopages/jsx.fragment') as typeof fragmentSymbolType;

export type JsxFragment = typeof fragmentSymbol;

/** HTML void element tag names — these elements must never receive a closing tag. */
const voidElementNames = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
]);

type ChildSlotMode = 'multiple' | 'single';

/**
 * Core element factory called by both {@link jsx} and {@link jsxs}.
 */
export function createJsxElement<Props extends object>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
	childSlotMode: ChildSlotMode,
): JsxRenderable {
	const keyedValue = (props as { key?: unknown }).key;

	if (typeof type === 'function') {
		return wrapKeyedValue(type(props), keyedValue);
	}

	if (type === fragmentSymbol) {
		const fragmentChildren = (props as JsxPropsWithChildren).children;

		return wrapKeyedValue(normalizeChildrenWithMode(fragmentChildren, childSlotMode), keyedValue);
	}

	if (type === 'slot') {
		return wrapKeyedValue(createSlotJsxValue(props as JsxPropsWithChildren & { name?: unknown }), keyedValue);
	}

	if (typeof type !== 'string') {
		throw new TypeError('Expected a JSX element type string.');
	}

	const strings = [`<${type}`];
	const values: unknown[] = [];
	const parts: TemplatePartDescriptor[] = [];
	const { children, key: _key, ...rawAttributes } = props as JsxPropsWithChildren & Record<string, unknown>;
	forEachNormalizedAttribute(rawAttributes, (name, value) => {
		appendBinding(strings, values, parts, type, name, value);
	});

	strings[strings.length - 1] += '>';

	// Void elements take neither children nor a closing tag; everything else is
	// otherwise assembled identically.
	if (!voidElementNames.has(type)) {
		appendElementChildren(strings, values, parts, type, children, childSlotMode);
		strings[strings.length - 1] += `</${type}>`;
	}

	return wrapKeyedValue(
		createTemplateResult(
			strings,
			values,
			parts,
			type,
			type.includes('-') ? (props as Record<string, unknown>) : undefined,
		),
		keyedValue,
	);
}

export function createMarkupNodeLike(outerHTML: string): JsxNodeLike {
	return {
		[RADIANT_MARKUP_NODE_SYMBOL]: true,
		nodeType: 1,
		outerHTML,
	};
}

function appendElementChildren(
	strings: string[],
	values: unknown[],
	parts: TemplatePartDescriptor[],
	type: string,
	children: JsxRenderable | undefined,
	childSlotMode: ChildSlotMode,
): void {
	if (type === 'script') {
		const rawTextContent = renderJsxRenderableToRawText(normalizeChildrenWithMode(children, childSlotMode));

		if (rawTextContent === '') {
			return;
		}

		values.push(createMarkupNodeLike(rawTextContent));
		parts.push({ type: 'child' });
		strings.push('');
		return;
	}

	appendChildren(strings, values, parts, children, childSlotMode);
}

function renderJsxRenderableToRawText(value: JsxRenderable | undefined): string {
	if (value === undefined || value === null || value === false || value === true) {
		return '';
	}

	if (typeof value === 'string') {
		return escapeRawTextElementText(value);
	}

	if (typeof value === 'number' || typeof value === 'bigint') {
		return String(value);
	}

	if (isIterableJsxChild(value)) {
		let rawText = '';

		for (const child of value) {
			rawText += renderJsxRenderableToRawText(child as JsxRenderable);
		}

		return rawText;
	}

	return escapeRawTextElementText(String(value));
}

/**
 * Escapes the only sequence that can terminate `<script>` text early.
 *
 * Inside a raw-text element the parser looks for `</script`, so that is the sole
 * sequence rewritten. Escaping every `<` would corrupt executable content —
 * `if (a < b)` is not a tag — which is why this is deliberately narrow.
 */
function escapeRawTextElementText(value: string): string {
	return value.replace(/<\/(?=script[\s/>])/gi, '<\\/');
}

function appendBinding(
	strings: string[],
	values: unknown[],
	parts: TemplatePartDescriptor[],
	elementName: string,
	name: string,
	value: unknown,
): void {
	if (value === undefined) {
		return;
	}

	parts.push(resolveBindingPart(elementName, name, value));
	values.push(value);
	strings.push('');
}

/**
 * Resolves an authored prop name to the binding kind and attribute name it denotes.
 *
 * Explicit prefixes (`on-native:`, `on:`, `prop:`, `attr:`) select a kind directly.
 * Unprefixed names fall back to per-element defaults: boolean attributes bind by
 * presence, custom elements bind by property unless the name is a known attribute.
 *
 * @param elementName Lowercase tag name, including custom-element names with `-`.
 * @param name Authored prop name, possibly carrying an explicit prefix.
 * @param value Bound value, resolved through reactive wrappers to pick the shape.
 */
function resolveBindingPart(
	elementName: string,
	name: string,
	value: unknown,
): Extract<TemplatePartDescriptor, { type: 'attribute' }> {
	if (name.startsWith('on-native:')) {
		return { kind: 'native-event', name: name.slice('on-native:'.length), type: 'attribute' };
	}

	if (name.startsWith('on:')) {
		const eventName = name.slice(3);
		return {
			kind: shouldDelegateEventBinding(eventName) ? 'event' : 'native-event',
			name: eventName,
			type: 'attribute',
		};
	}

	if (name.startsWith('prop:')) {
		return { kind: 'prop', name: name.slice(5), type: 'attribute' };
	}

	if (name.startsWith('attr:')) {
		return { kind: 'attr', name: name.slice(5), type: 'attribute' };
	}

	if (typeof resolveReactiveSnapshot(value) === 'boolean' && shouldUseBooleanAttributeBinding(name)) {
		return { kind: 'bool', name, type: 'attribute' };
	}

	if (!shouldUseAttributeBindingByDefaultForElement(elementName, name)) {
		return { kind: 'prop', name, type: 'attribute' };
	}

	return { kind: 'attr', name, type: 'attribute' };
}

/**
 * Emits `children` into the template's value slots.
 *
 * `multiple` mode (from `jsxs`) gives each sibling its own slot so the renderer can
 * reconcile them positionally; `single` mode collapses the whole subtree into one
 * slot. Empty slots are dropped entirely rather than emitted as blanks.
 */
function appendChildren(
	strings: string[],
	values: unknown[],
	parts: TemplatePartDescriptor[],
	children: JsxRenderable | undefined,
	childSlotMode: ChildSlotMode,
): void {
	for (const slot of toChildSlots(children, childSlotMode)) {
		values.push(slot);
		parts.push({ type: 'child' });
		strings.push('');
	}
}

/**
 * Resolves `children` to the value a fragment should render as.
 *
 * Unlike {@link appendChildren}, a fragment has no element to hang slots on, so a
 * lone surviving child renders as itself. That collapse deliberately does not apply
 * to element children: an element keeps a one-entry list as a list so the renderer
 * reconciles it positionally instead of treating it as a single child.
 */
function normalizeChildrenWithMode(children: JsxRenderable | undefined, childSlotMode: ChildSlotMode): JsxRenderable {
	if (childSlotMode === 'multiple' && isIterableJsxChild(children)) {
		const slots = toChildSlots(children, childSlotMode);

		if (slots.length === 0) {
			return '';
		}

		return (slots.length === 1 ? slots[0] : slots) as JsxRenderable;
	}

	const slot = toChildSlot(children);

	if (slot === undefined) {
		return '';
	}

	return (Array.isArray(slot) && slot.length === 1 ? slot[0] : slot) as JsxRenderable;
}

/**
 * Splits `children` into the discrete slot values for the given slot mode.
 *
 * `multiple` keeps siblings in separate slots; `single` folds the whole subtree into
 * one. Both drop `undefined`, `null`, and `false`.
 */
function toChildSlots(children: JsxRenderable | undefined, childSlotMode: ChildSlotMode): unknown[] {
	if (childSlotMode === 'multiple' && isIterableJsxChild(children)) {
		const slots: unknown[] = [];

		for (const child of children) {
			const slot = toChildSlot(child as JsxRenderable);

			if (slot !== undefined) {
				slots.push(slot);
			}
		}

		return slots;
	}

	const slot = toChildSlot(children);
	return slot === undefined ? [] : [slot];
}

/**
 * Flattens one child into its slot value, or `undefined` when it renders nothing.
 *
 * Iterables stay arrays even when they hold a single entry, so the renderer keeps
 * treating them as lists.
 */
function toChildSlot(child: JsxRenderable | undefined): unknown {
	if (child === undefined || child === null || child === false) {
		return undefined;
	}

	if (!isIterableJsxChild(child)) {
		return child;
	}

	const flattenedChildren = flattenChildren(child);
	return flattenedChildren.length === 0 ? undefined : flattenedChildren;
}

function flattenChildren(children: JsxRenderable | undefined): unknown[] {
	const flattenedChildren: unknown[] = [];
	appendFlattenedChildren(flattenedChildren, children);
	return flattenedChildren;
}

function appendFlattenedChildren(flattenedChildren: unknown[], children: JsxRenderable | undefined): void {
	if (children === undefined || children === null || children === false) {
		return;
	}

	if (isIterableJsxChild(children)) {
		for (const child of children) {
			appendFlattenedChildren(flattenedChildren, child as JsxRenderable);
		}
		return;
	}

	flattenedChildren.push(children);
}

function createTemplateResult(
	strings: string[],
	values: unknown[],
	parts: TemplatePartDescriptor[],
	rootLocalName: string,
	ssrIntrinsicProps?: Readonly<Record<string, unknown>>,
): TemplateResultLike {
	return {
		[RADIANT_TEMPLATE_RESULT_FIELD]: RADIANT_TEMPLATE_RESULT,
		parts,
		rootLocalName,
		shapeKey: getTemplateShapeKey(strings, parts),
		ssrIntrinsicProps,
		strings,
		values,
	};
}

function wrapKeyedValue(value: JsxRenderable, key: unknown): JsxRenderable {
	if (typeof key !== 'string' && typeof key !== 'number') {
		return value;
	}

	return {
		key,
		value,
		[KEYED_VALUE_SYMBOL]: true,
	};
}

function createSlotJsxValue(props: JsxPropsWithChildren & { name?: unknown }): SlotJsxValue {
	return {
		fallback: props.children,
		name: typeof props.name === 'string' && props.name !== '' ? props.name : undefined,
		[SLOT_JSX_VALUE_SYMBOL]: true,
	};
}
