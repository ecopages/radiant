import { RAW_TEXT_ELEMENT_NAMES } from './raw-text-element-names.ts';
import { shouldDelegateEventBinding } from './event-binding-policy.ts';
import { getTemplateShapeKey } from './template-shape.ts';
import { forEachNormalizedAttribute } from './attribute-normalize.ts';
import { shouldUseAttributeBindingByDefaultForElement, shouldUseBooleanAttributeBinding } from './binding-defaults.ts';
import { isIterableJsxChild, isKeyedJsxValue, resolveReactiveSnapshot } from '../types/renderable-guards.ts';
import {
	CUSTOM_ELEMENT_CHILDREN_SYMBOL,
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

declare const radiantCustomElementTagNameType: unique symbol;
const radiantCustomElementTagName = Symbol.for(
	'@ecopages/radiant.customElementTagName',
) as typeof radiantCustomElementTagNameType;

/**
 * Custom-element class constructor accepted as a JSX type.
 *
 * @remarks `any[]` lets classes with different constructor signatures share
 * the public JSX element type.
 */
type JsxClassElement = abstract new (...args: any[]) => Element;

function isCustomizedBuiltIn(type: Function): boolean {
	let prototype: object | null = Object.getPrototypeOf((type as Function & { prototype: object }).prototype);
	while (prototype) {
		const constructor = (prototype as { constructor: Function }).constructor;
		const name = constructor.name;
		if (name.startsWith('HTML') && (globalThis as unknown as Record<string, unknown>)[name] === constructor) {
			return name !== 'HTMLElement';
		}
		prototype = Object.getPrototypeOf(prototype);
	}
	return false;
}

function resolveCustomElementTagName(type: Function): string | undefined {
	const tagName =
		(type as unknown as { [radiantCustomElementTagName]?: string })[radiantCustomElementTagName] ||
		globalThis.customElements?.getName?.(type as CustomElementConstructor);
	if (tagName) {
		if (isCustomizedBuiltIn(type)) {
			throw new TypeError('Customized built-ins are unsupported.');
		}

		return tagName;
	}

	if (Function.prototype.toString.call(type).startsWith('class')) {
		throw new TypeError(`Class ${type.name}: use @customElement(...) or customElements.define() before rendering.`);
	}

	return undefined;
}

/**
 * Core element factory called by both {@link jsx} and {@link jsxs}.
 *
 * @remarks An element gets child parts only when `props` has a `children` key, which
 * the JSX transform sets for every authored child expression (`<p>{x}</p>`) and omits
 * for `<p />`. The key, not the value, decides, so `undefined` still keeps its part
 * and the template shape follows the authored markup.
 *
 * A custom element whose class takes its children as a value
 * ({@link CUSTOM_ELEMENT_CHILDREN_SYMBOL}) gets one `children` binding instead of child
 * parts, unless `childrenAsDom` is set. The class is looked up when the element is created.
 */
export function createJsxElement<Props extends object>(
	type: string | JsxFragment | JsxComponent<Props> | JsxClassElement,
	props: Props,
	childSlotMode: ChildSlotMode,
	childrenAsDom = false,
): JsxRenderable {
	const keyedValue = (props as { key?: unknown }).key;

	if (typeof type === 'function') {
		const tagName = resolveCustomElementTagName(type);
		if (!tagName) {
			return wrapKeyedValue((type as JsxComponent<Props>)(props), keyedValue);
		}

		return createJsxElement(tagName, props, childSlotMode, childrenAsDom);
	}

	if (type === fragmentSymbol) {
		const fragmentChildren = (props as JsxPropsWithChildren).children;

		return wrapKeyedValue((toChildSlot(fragmentChildren) ?? '') as JsxRenderable, keyedValue);
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
	const hasChildren = 'children' in props;
	const childrenAsValue = hasChildren && !childrenAsDom && takesChildrenValue(type);

	if (childrenAsValue) {
		parts.push({ kind: 'children', name: 'children', type: 'attribute' });
		values.push(toChildSlot(children));
		strings.push('');
	}

	strings[strings.length - 1] += '>';

	// Void elements take neither children nor a closing tag; everything else is
	// otherwise assembled identically.
	if (!voidElementNames.has(type)) {
		if (hasChildren && !childrenAsValue) {
			appendElementChildren(strings, values, parts, type, children, childSlotMode);
		}
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

/** Whether the class registered for `type` takes its JSX children as a value ({@link CUSTOM_ELEMENT_CHILDREN_SYMBOL}). */
export function takesChildrenValue(type: string): boolean {
	const constructor =
		type.includes('-') && typeof customElements !== 'undefined' ? customElements.get(type) : undefined;

	return (
		(constructor as { [CUSTOM_ELEMENT_CHILDREN_SYMBOL]?: unknown } | undefined)?.[
			CUSTOM_ELEMENT_CHILDREN_SYMBOL
		] === true
	);
}

function appendElementChildren(
	strings: string[],
	values: unknown[],
	parts: TemplatePartDescriptor[],
	type: string,
	children: JsxRenderable | undefined,
	childSlotMode: ChildSlotMode,
): void {
	if (RAW_TEXT_ELEMENT_NAMES.has(type)) {
		const rawTextContent = renderJsxRenderableToRawText(type, children);

		values.push(createMarkupNodeLike(rawTextContent));
		parts.push({ type: 'child' });
		strings.push('');
		return;
	}

	appendChildren(strings, values, parts, children, childSlotMode);
}

function renderJsxRenderableToRawText(tagName: string, value: JsxRenderable | undefined): string {
	if (value === undefined || value === null || value === false || value === true) {
		return '';
	}

	if (typeof value === 'string') {
		return escapeRawTextElementText(tagName, value);
	}

	if (typeof value === 'number' || typeof value === 'bigint') {
		return String(value);
	}

	if (isIterableJsxChild(value)) {
		let rawText = '';

		for (const child of value) {
			rawText += renderJsxRenderableToRawText(tagName, child as JsxRenderable);
		}

		return rawText;
	}

	return escapeRawTextElementText(tagName, String(value));
}

/**
 * Escapes the only sequence that can terminate a raw-text element's content early.
 *
 * @remarks Inside `script` or `style` the parser looks for `</{tag}`, so that is the sole
 * sequence rewritten. Escaping every `<` would corrupt CSS and executable content —
 * `.a > .b` and `if (a < b)` are not tags.
 */
function escapeRawTextElementText(tagName: string, value: string): string {
	return value.replace(new RegExp(`</(?=${tagName}[\\s/>])`, 'gi'), '<\\/');
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
 * slot.
 *
 * @remarks Every authored child expression keeps its slot, holding `null` while it
 * renders nothing, so the template shape depends on the markup and not on the values.
 * A dropped slot would change the shape key and make the renderer replace the element.
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
 * Splits `children` into the discrete slot values for the given slot mode.
 *
 * `multiple` keeps siblings in separate slots; `single` folds the whole subtree into
 * one.
 */
function toChildSlots(children: JsxRenderable | undefined, childSlotMode: ChildSlotMode): unknown[] {
	if (childSlotMode === 'multiple' && isIterableJsxChild(children)) {
		return Array.from(children, (child) => toChildSlot(child as JsxRenderable));
	}

	return [toChildSlot(children)];
}

/**
 * Resolves one child to its slot value, or `null` when it renders nothing.
 *
 * A fragment's value comes from here too: its children are a list, and a lone non-list
 * child renders as itself. Iterables stay arrays even when they hold a single entry, so
 * the renderer keeps treating them as lists.
 *
 * @remarks A list keeps one entry per item: an empty item is a `null` hole and a
 * nested list stays one nested entry, so an item's position never depends on the
 * values before it. A value that flipped between a single child and a list, or a list
 * whose positions shifted, would make the renderer rebuild items that did not change.
 * A nested list is never merged into its parent, even when it is all keyed: a keyed
 * group such as `rows.map(...)` keeps its own range whatever its siblings hold. When
 * every filled item is itself keyed, the list is those keyed items without the holes:
 * keyed reconciliation matches by key, so positions do not matter. An empty list is
 * `null`, like any other empty child.
 */
function toChildSlot(child: JsxRenderable | undefined): unknown {
	if (child === undefined || child === null || child === false) {
		return null;
	}

	if (!isIterableJsxChild(child)) {
		return child;
	}

	const slots = Array.from(child, (entry) => toChildSlot(entry as JsxRenderable));
	const filledSlots = slots.filter((slot) => slot !== null);

	if (filledSlots.length === 0) {
		return null;
	}

	return filledSlots.every(isKeyedJsxValue) ? filledSlots : slots;
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
