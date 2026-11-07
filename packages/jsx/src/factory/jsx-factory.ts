import { shouldDelegateEventBinding } from './event-binding-policy.ts';
import { forEachNormalizedAttribute } from './attribute-normalize.ts';
import { shouldUseAttributeBindingByDefaultForElement, shouldUseBooleanAttributeBinding } from './binding-defaults.ts';
import { isIterableJsxChild, isKeyedJsxValue, resolveReactiveSnapshot } from '../types/renderable-guards.ts';
import { getCustomElementTagName } from '../custom-element-tag-name.ts';
import {
	CUSTOM_ELEMENT_CHILDREN_SYMBOL,
	KEYED_VALUE_SYMBOL,
	RADIANT_MARKUP_NODE_SYMBOL,
	RADIANT_TEMPLATE_RESULT,
	RADIANT_TEMPLATE_RESULT_FIELD,
} from '../types/index.ts';
import type {
	JsxComponent,
	JsxNodeLike,
	JsxPropsWithChildren,
	JsxRenderable,
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
 * Custom-element class constructor accepted as a JSX type.
 *
 * @remarks `any[]` lets classes with different constructor signatures share
 * the public JSX element type.
 */
type JsxClassElement = abstract new (...args: any[]) => Element;

/**
 * @remarks Walks the prototype chain to the nearest global `HTML*` constructor; any such base other than
 * `HTMLElement` makes the class a customized built-in.
 */
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

/**
 * @remarks Every function JSX type passes through here on every render. A class constructor's `prototype` is
 * not writable, unlike a `function` or generator's, and an arrow function has none, so the class check never
 * stringifies the function source.
 */
function resolveCustomElementTagName(type: Function): string | undefined {
	const tagName = getCustomElementTagName(type as CustomElementConstructor);
	if (tagName) {
		if (isCustomizedBuiltIn(type)) {
			throw new TypeError(`Class ${type.name} (<${tagName}>): customized built-ins are unsupported.`);
		}

		return tagName;
	}

	if (Object.getOwnPropertyDescriptor(type, 'prototype')?.writable === false) {
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
 *
 * `key` is the automatic runtime's third argument, read from `props` when absent. Only a function component receives
 * it in its props, so an element's props are never copied to carry it.
 */
export function createJsxElement<Props extends object>(
	type: string | JsxFragment | JsxComponent<Props> | JsxClassElement,
	props: Props,
	childSlotMode: ChildSlotMode,
	childrenAsDom = false,
	key: unknown = (props as { key?: unknown }).key,
): JsxRenderable {
	const keyedValue = key;

	if (typeof type === 'function') {
		const tagName = resolveCustomElementTagName(type);
		if (!tagName) {
			return renderComponent(type as JsxComponent<Props>, props, key);
		}

		return createJsxElement(tagName, props, childSlotMode, childrenAsDom, key);
	}

	if (type === fragmentSymbol) {
		const fragmentChildren = (props as JsxPropsWithChildren).children;

		return wrapKeyedValue((toChildSlot(fragmentChildren) ?? '') as JsxRenderable, keyedValue);
	}

	if (typeof type !== 'string') {
		throw new TypeError('Expected a JSX element type string.');
	}

	const strings = [`<${type}`];
	const values: unknown[] = [];
	const parts: TemplatePartDescriptor[] = [];
	const children = (props as JsxPropsWithChildren).children;
	forEachNormalizedAttribute(props as Record<string, unknown>, (name, value) => {
		appendBinding(strings, values, parts, type, name, value);
	});
	const hasChildren = 'children' in props;
	const childrenAsValue = hasChildren && !childrenAsDom && takesChildrenValue(type);

	if (childrenAsValue) {
		parts.push(CHILDREN_PART);
		values.push(toChildSlot(children));
		strings.push('');
	}

	strings[strings.length - 1] += '>';

	// Void elements take neither children nor a closing tag; everything else is
	// otherwise assembled identically.
	if (!voidElementNames.has(type)) {
		if (hasChildren && !childrenAsValue) {
			appendChildren(strings, values, parts, children, childSlotMode);
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

/** Calls a function component with `key` in its props, as the automatic runtime passed it. */
function renderComponent<Props extends object>(component: JsxComponent<Props>, props: Props, key: unknown): JsxRenderable {
	const componentProps = key === (props as { key?: unknown }).key ? props : { ...props, key };
	return wrapKeyedValue(component(componentProps), key);
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

/**
 * @remarks `className` on a native element is skipped: it is not an HTML attribute, and writing it would leave the
 * element without its class. `jsxDEV` from `@ecopages/jsx/jsx-dev-runtime` warns about it. A custom element keeps it
 * as a property binding.
 */
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

	if (name === 'className' && !elementName.includes('-')) {
		return;
	}

	parts.push(getBindingPart(elementName, name, value));
	values.push(value);
	strings.push('');
}

type AttributePartDescriptor = Extract<TemplatePartDescriptor, { type: 'attribute' }>;

/**
 * Attribute part descriptors shared by every element that binds the same name the same way.
 *
 * @remarks A descriptor depends only on the authored name, whether the element is a custom element, and whether the
 * value is a boolean (see {@link resolveBindingPart}), so one frozen object serves every render. Sharing them keeps
 * {@link getFactoryShapeKey} on identity lookups. The map stops growing at {@link MAX_BINDING_PARTS}: names that come
 * from data, such as the keys of a `data` object, would otherwise grow it for as long as a server runs. Past the cap a
 * descriptor is created per use and the shape key is built as a string. Each name holds its four variants by index,
 * so a lookup builds no key string.
 */
const BINDING_PARTS = new Map<string, (AttributePartDescriptor | undefined)[]>();
const MAX_BINDING_PARTS = 2048;

/** Descriptors that are shared, and so can key a node of the shape tree. */
const SHARED_PARTS = new WeakSet<TemplatePartDescriptor>();

/**
 * @remarks Reads the value's snapshot only for a standard boolean attribute, where it decides the binding kind.
 * Reading a signal calls its `get()`, which subscribes any computed that is creating this JSX, so reading it for
 * every attribute re-ran a computed list whenever a row's class or label changed.
 */
function getBindingPart(elementName: string, name: string, value: unknown): AttributePartDescriptor {
	const isBoolean = shouldUseBooleanAttributeBinding(name) && typeof resolveReactiveSnapshot(value) === 'boolean';
	const variant = (elementName.includes('-') ? 2 : 0) + (isBoolean ? 1 : 0);
	let variants = BINDING_PARTS.get(name);

	if (!variants && BINDING_PARTS.size < MAX_BINDING_PARTS) {
		variants = [];
		BINDING_PARTS.set(name, variants);
	}

	let part = variants?.[variant];

	if (!part) {
		part = Object.freeze(resolveBindingPart(elementName, name, value));
		if (variants) {
			variants[variant] = part;
			SHARED_PARTS.add(part);
		}
	}

	return part;
}

/**
 * Resolves an authored prop name to the binding kind and attribute name it denotes.
 *
 * Explicit prefixes (`on-native:`, `on:`, `prop:`, `attr:`, `bool:`) select a kind directly.
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

	if (name.startsWith('bool:')) {
		return { kind: 'bool', name: name.slice(5), type: 'attribute' };
	}

	if (shouldUseBooleanAttributeBinding(name) && typeof resolveReactiveSnapshot(value) === 'boolean') {
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
	if (childSlotMode === 'multiple' && isIterableJsxChild(children)) {
		for (const child of children) appendChildSlot(strings, values, parts, toChildSlot(child as JsxRenderable));
		return;
	}

	appendChildSlot(strings, values, parts, toChildSlot(children));
}

function appendChildSlot(strings: string[], values: unknown[], parts: TemplatePartDescriptor[], slot: unknown): void {
	values.push(slot);
	parts.push(CHILD_PART);
	strings.push('');
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

const CHILD_PART: TemplatePartDescriptor = Object.freeze({ type: 'child' });
const CHILDREN_PART: AttributePartDescriptor = Object.freeze({ kind: 'children', name: 'children', type: 'attribute' });
SHARED_PARTS.add(CHILD_PART);
SHARED_PARTS.add(CHILDREN_PART);

type ShapeNode = {
	readonly key: string;
	next?: Map<TemplatePartDescriptor, ShapeNode>;
};

/** Shape keys of factory templates, as a tree from the tag through each shared part descriptor. */
const SHAPE_ROOTS = new Map<string, ShapeNode>();
const MAX_SHAPE_NODES = 8192;
let shapeNodeCount = 0;

/**
 * Returns the shape key of a template built by the factory.
 *
 * @remarks A factory template's static strings follow from its tag and its parts: one empty string per binding,
 * `>`, one per child, and the closing tag. So the tag and the part sequence identify the shape, and walking a tree
 * keyed by the shared descriptors finds the key without building a string per render. Keys start with `\u0001`,
 * which the strings-based `getTemplateShapeKey` keys of transported templates never do, so the two never
 * collide.
 *
 * The tree stops growing at {@link MAX_SHAPE_NODES} nodes, so shapes built from data cannot grow it without bound on
 * a server. Past the cap, or at a descriptor that is not shared (created past {@link MAX_BINDING_PARTS}), the rest
 * of the key is built as a string in the same format, so equal shapes still get equal keys and no node is added
 * that a later lookup could not match.
 */
function getFactoryShapeKey(type: string, parts: readonly TemplatePartDescriptor[]): string {
	let node: ShapeNode | undefined = SHAPE_ROOTS.get(type);

	if (!node) {
		node = { key: `\u0001${type}` };
		if (shapeNodeCount >= MAX_SHAPE_NODES) return appendShapeTokens(node.key, parts, 0);
		SHAPE_ROOTS.set(type, node);
		shapeNodeCount += 1;
	}

	for (let index = 0; index < parts.length; index += 1) {
		const part = parts[index]!;
		let child: ShapeNode | undefined = node.next?.get(part);

		if (!child) {
			if (shapeNodeCount >= MAX_SHAPE_NODES || !SHARED_PARTS.has(part))
				return appendShapeTokens(node.key, parts, index);
			child = { key: `${node.key}\u0002${describeShapePart(part)}` };
			(node.next ??= new Map()).set(part, child);
			shapeNodeCount += 1;
		}

		node = child;
	}

	return node.key;
}

function describeShapePart(part: TemplatePartDescriptor): string {
	return part.type === 'child' ? 'c' : `${part.kind}:${part.name}`;
}

function appendShapeTokens(prefix: string, parts: readonly TemplatePartDescriptor[], start: number): string {
	let key = prefix;
	for (let index = start; index < parts.length; index += 1) key += `\u0002${describeShapePart(parts[index]!)}`;
	return key;
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
		shapeKey: getFactoryShapeKey(rootLocalName, parts),
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
