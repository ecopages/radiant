import { shouldDelegateEventBinding } from './event-binding-policy.ts';
import { escapeAttribute, escapeHtml } from './html-escape.ts';
import { getTemplateInterpolationParts } from './hydration-bindings.ts';
import {
	KEYED_VALUE_SYMBOL,
	RADIANT_TEMPLATE_RESULT,
	RADIANT_TEMPLATE_RESULT_FIELD,
	SLOT_JSX_VALUE_SYMBOL,
	SUBSCRIBABLE_JSX_VALUE_SYMBOL,
} from './types.ts';
import type {
	KeyedJsxValue,
	JsxComponent,
	JsxCustomIntrinsicElements,
	JsxIntrinsicAttributes,
	JsxKey,
	JsxNodeLike,
	JsxNodeType,
	JsxPrimitive,
	JsxPropsWithChildren,
	JsxRenderable,
	SignalLike,
	SlotJsxValue,
	SubscribableJsxValue,
	ServerCustomElementRenderHook,
	ServerCustomElementRenderHookContext,
	ServerRenderableCustomElement,
	TemplateResultLike,
} from './types.ts';
export type {
	AriaAttributesNormalized,
	ClassList,
	DataAttributeValue,
	KeyedJsxValue,
	JsxComponent,
	JsxCustomElementAttributes,
	JsxCustomIntrinsicElements,
	JsxElementProps,
	JsxEventHandler,
	JsxEventListener,
	JsxEventListenerObject,
	JsxHtmlProps,
	JsxIntrinsicAttributes,
	JsxKey,
	JsxNodeLike,
	JsxNodeType,
	JsxPrimitive,
	JsxPropsWithChildren,
	JsxRenderable,
	SignalLike,
	ServerCustomElementRenderHook,
	ServerCustomElementRenderHookContext,
	ServerRenderableCustomElement,
	SlotJsxValue,
	StylePropertyValue,
	StyleValue,
	SubscribableJsxValue,
	TemplateResultLike,
} from './types.ts';
/** When `true` on `globalThis`, bypasses the `document` check and forces server-side custom-element rendering. */
const FORCE_SERVER_CUSTOM_ELEMENT_RENDER_SYMBOL = Symbol.for('@ecopages/jsx.force-server-custom-element-render');
/** When `true` on `globalThis`, signals that the current SSR pass should emit hydration binding markers. */
const ACTIVE_SSR_HYDRATE_SYMBOL = Symbol.for('@ecopages/jsx.active-ssr-hydrate');
/** Global slot used by SSR adapters to observe or augment custom-element renders. */
const SERVER_CUSTOM_ELEMENT_RENDER_HOOK_SYMBOL = Symbol.for('@ecopages/jsx.server-custom-element-render-hook');

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

/** Well-known symbol that identifies a JSX fragment in the Radiant runtime. */
const fragmentSymbol = Symbol.for('@ecopages/jsx.fragment');

/**
 * Internal fragment marker type used by the automatic JSX runtime.
 */
export type JsxFragment = typeof fragmentSymbol;

type JsxDomIntrinsicElements = {
	[ElementName in keyof HTMLElementTagNameMap]: JsxIntrinsicAttributes<HTMLElementTagNameMap[ElementName]>;
} & {
	[ElementName in keyof SVGElementTagNameMap]: JsxIntrinsicAttributes<SVGElementTagNameMap[ElementName]>;
};

/**
 * Fragment marker used by the automatic JSX runtime.
 */
export const Fragment: JsxFragment = fragmentSymbol;

/**
 * Creates a JSX element where the `children` slot is treated as a single
 * logical value.
 *
 * This matches the behavior of the automatic JSX runtime for calls that come
 * from `jsx(...)`, which is typically used when the original source had a
 * single child expression.
 */
export function jsx<Props extends object>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
): JsxRenderable {
	return createJsxElement(type, props, 'single');
}

/**
 * Creates a JSX element where sibling children are emitted as positional child
 * slots.
 *
 * This matches the behavior of the automatic JSX runtime for calls that come
 * from `jsxs(...)`, which is typically used when the original source had
 * multiple sibling children.
 */
export function jsxs<Props extends object>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
): JsxRenderable {
	return createJsxElement(type, props, 'multiple');
}

/**
 * Controls how the `children` prop is distributed across child slots.
 *
 * - `'single'`   — `children` is treated as one logical value (emitted from `jsx`).
 * - `'multiple'` — `children` is an array of positional siblings (emitted from `jsxs`).
 */
type ChildSlotMode = 'multiple' | 'single';

/**
 * Type information consumed by TypeScript when `jsxImportSource` points at this package.
 */
export namespace JSX {
	export type Element = JsxRenderable;
	export type ElementType = string | JsxFragment | JsxComponent<any>;

	export interface ElementChildrenAttribute {
		children: {};
	}

	export interface IntrinsicAttributes {
		key?: JsxKey;
	}

	export type IntrinsicElements = JsxDomIntrinsicElements &
		JsxCustomIntrinsicElements & {
			[elementName: string]: JsxIntrinsicAttributes<globalThis.Element>;
		};
}

/**
 * Core element factory called by both {@link jsx} and {@link jsxs}.
 *
 * Dispatch order:
 * 1. Function component — invoked directly, result wrapped with any key.
 * 2. Fragment — children normalized and wrapped with any key.
 * 3. Custom element eligible for server rendering — delegated to
 *    {@link createServerRenderedCustomElement}.
 * 4. Intrinsic HTML element — a Radiant {@link TemplateResultLike} is built
 *    from static strings and dynamic binding values.
 *
 * @param type Intrinsic tag name, fragment symbol, or function component.
 * @param props Combined props and children for this renderable.
 * @param childSlotMode Whether `children` holds a single value or multiple sibling values.
 * @returns A {@link JsxRenderable} ready for DOM mounting or SSR serialization.
 */
function createJsxElement<Props extends object>(
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

	const serverRenderedCustomElement = createServerRenderedCustomElement(type, props);

	if (serverRenderedCustomElement) {
		return wrapKeyedValue(serverRenderedCustomElement, keyedValue);
	}

	const strings = [`<${type}`];
	const values: unknown[] = [];
	const { children, key: _key, ...rawAttributes } = props as JsxPropsWithChildren & Record<string, unknown>;
	forEachNormalizedAttribute(rawAttributes, (name, value) => {
		appendBinding(strings, values, name, value);
	});

	if (voidElementNames.has(type)) {
		strings[strings.length - 1] += '>';
		return wrapKeyedValue(createTemplateResult(strings, values, type), keyedValue);
	}

	strings[strings.length - 1] += '>';
	appendElementChildren(strings, values, type, children, childSlotMode);
	strings[strings.length - 1] += `</${type}>`;

	return wrapKeyedValue(createTemplateResult(strings, values, type), keyedValue);
}

function appendElementChildren(
	strings: string[],
	values: unknown[],
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
		strings.push('');
		return;
	}

	appendChildren(strings, values, children, childSlotMode);
}

/**
 * Minimal interface required of a custom element instance for server-side rendering.
 *
 * Elements that implement this interface can participate in the JSX SSR pipeline:
 * the runtime instantiates the constructor, applies attributes and children, then
 * calls `renderHostToString` to obtain the serialized HTML fragment.
 */
/**
 * Attempts to render a custom element on the server by instantiating its registered
 * constructor and calling `renderHostToString`.
 *
 * Returns `undefined` when server rendering is not applicable: the tag name does not
 * contain a hyphen, the runtime is running in a browser context (unless the force-render
 * flag is set), the element is not registered in `customElements`, or the instance does
 * not implement the {@link ServerRenderableCustomElement} interface.
 *
 * @param type Lowercase custom-element tag name (must contain a hyphen).
 * @param props Combined JSX props including children.
 * @returns A {@link JsxNodeLike} whose `outerHTML` getter delegates to the element's
 *   `renderHostToString`, or `undefined` when SSR is not applicable.
 */
function createServerRenderedCustomElement<Props extends object>(type: string, props: Props): JsxNodeLike | undefined {
	if (!shouldServerRenderCustomElement(type)) {
		return undefined;
	}

	const registry = (
		globalThis as typeof globalThis & {
			customElements?: {
				get(name: string): CustomElementConstructor | undefined;
			};
		}
	).customElements;
	const constructor = registry?.get(type);

	if (!constructor) {
		return undefined;
	}

	const instance = new constructor() as unknown;

	if (!isServerRenderableCustomElement(instance)) {
		return undefined;
	}

	const { children, key: _key, ...rawAttributes } = props as JsxPropsWithChildren & Record<string, unknown>;
	applyServerCustomElementAttributes(instance, rawAttributes);
	applyServerCustomElementChildren(instance, children);
	const hookRender = getServerCustomElementRenderHook()?.({
		constructor,
		hydrate: getActiveSsrHydrateMode(),
		instance,
		props: rawAttributes,
		tagName: type,
	});

	if (hookRender) {
		return hookRender;
	}

	return {
		nodeType: 1,
		get outerHTML() {
			return instance.renderHostToString({ hydrate: getActiveSsrHydrateMode() });
		},
	};
}

/**
 * Reads the active SSR hydrate flag from `globalThis`.
 *
 * The flag is set by `renderToString` in the server-render module before
 * walking the JSX tree, ensuring that custom elements created during that
 * pass emit hydration markers.
 *
 * @returns `true` when the current render pass should emit hydration binding markers.
 */
function getActiveSsrHydrateMode(): boolean {
	return (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[ACTIVE_SSR_HYDRATE_SYMBOL] === true;
}

/**
 * Runs a synchronous SSR render with a temporary intrinsic custom-element hook.
 *
 * This is intended for server adapters that need to collect metadata while the
 * JSX runtime walks a tree. The previous hook is restored immediately after the
 * callback returns or throws.
 */
export function withServerCustomElementRenderHook<T>(hook: ServerCustomElementRenderHook, render: () => T): T {
	const globalScope = globalThis as typeof globalThis & Record<PropertyKey, unknown>;
	const previousHook = globalScope[SERVER_CUSTOM_ELEMENT_RENDER_HOOK_SYMBOL];
	globalScope[SERVER_CUSTOM_ELEMENT_RENDER_HOOK_SYMBOL] = hook;
	const restoreHook = () => {
		if (previousHook === undefined) {
			delete globalScope[SERVER_CUSTOM_ELEMENT_RENDER_HOOK_SYMBOL];
		} else {
			globalScope[SERVER_CUSTOM_ELEMENT_RENDER_HOOK_SYMBOL] = previousHook;
		}
	};

	try {
		const result = render();

		if (isPromiseLike(result)) {
			return Promise.resolve(result).finally(restoreHook) as T;
		}

		restoreHook();
		return result;
	} catch (error) {
		restoreHook();
		throw error;
	}
}

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
	return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function';
}

function getServerCustomElementRenderHook(): ServerCustomElementRenderHook | undefined {
	const hook = (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
		SERVER_CUSTOM_ELEMENT_RENDER_HOOK_SYMBOL
	];

	return typeof hook === 'function' ? (hook as ServerCustomElementRenderHook) : undefined;
}

/**
 * Decides whether a given element type should be rendered on the server.
 *
 * A custom element tag (containing a hyphen) qualifies when either:
 * - `document` is not defined (Node.js / Bun / Deno environment), or
 * - the {@link FORCE_SERVER_CUSTOM_ELEMENT_RENDER_SYMBOL} flag is set on `globalThis`.
 *
 * @param type Element tag name to evaluate.
 * @returns `true` when server-side custom element rendering should be attempted.
 */
function shouldServerRenderCustomElement(type: string): boolean {
	return (
		type.includes('-') &&
		(typeof document === 'undefined' ||
			(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
				FORCE_SERVER_CUSTOM_ELEMENT_RENDER_SYMBOL
			] === true)
	);
}

/**
 * Type guard that narrows `value` to {@link ServerRenderableCustomElement}.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` is an object with a `renderHostToString` method.
 */
function isServerRenderableCustomElement(value: unknown): value is ServerRenderableCustomElement {
	return typeof value === 'object' && value !== null && 'renderHostToString' in value;
}

/**
 * Applies normalized attributes onto a server-renderable custom element instance.
 *
 * Binding rules (applied in order):
 * - `on:*`, `on-native:*`, and `undefined` values are skipped (event handlers are
 *   not serializable, so they are not applied during SSR).
 * - `prop:*` bindings are set directly as properties on the element.
 * - Known element properties (non-hyphenated names already present on the
 *   instance) are set directly as properties.
 * - Boolean attribute values emit an empty string attribute (truthy) or
 *   remove the attribute (falsy).
 * - All other values are serialized via `String()` and passed to `setAttribute`.
 *
 * @param element Target custom element instance.
 * @param attributes Raw JSX props with `children` and `key` already removed.
 */
function applyServerCustomElementAttributes(
	element: ServerRenderableCustomElement,
	attributes: Record<string, unknown>,
): void {
	forEachNormalizedAttribute(attributes, (name, value) => {
		if (value === undefined || name.startsWith('on:') || name.startsWith('on-native:')) {
			return;
		}

		if (name.startsWith('prop:')) {
			element[name.slice(5)] = value;
			return;
		}

		if (name in element && !name.includes('-')) {
			element[name] = value;
			return;
		}

		if (typeof value === 'boolean') {
			if (value) {
				element.setAttribute?.(name, '');
			} else {
				element.removeAttribute?.(name);
			}
			return;
		}

		element.setAttribute?.(name, String(value));
	});
}

/**
 * Serializes JSX children and assigns them to the appropriate property on a
 * server-renderable custom element.
 *
 * The function checks for the presence of `children` and `innerHTML` properties
 * on the element instance and sets whichever are found. This allows custom
 * elements to opt in to either convention. When both properties exist, both are
 * set with the same serialized string.
 *
 * No-ops when `children` is `undefined` or the element exposes neither property.
 *
 * @param element Target custom element instance.
 * @param children JSX children from the `props.children` slot.
 */
function applyServerCustomElementChildren(
	element: ServerRenderableCustomElement,
	children: JsxRenderable | undefined,
): void {
	if (children === undefined || !('children' in element || 'innerHTML' in element)) {
		return;
	}

	const serializedChildren = renderJsxRenderableToString(children);

	if (canAssignServerCustomElementProperty(element, 'children')) {
		element.children = serializedChildren;
	}

	if (canAssignServerCustomElementProperty(element, 'innerHTML')) {
		element.innerHTML = serializedChildren;
	}
}

function canAssignServerCustomElementProperty(element: ServerRenderableCustomElement, propertyName: string): boolean {
	let current: object | null = element as object;

	while (current) {
		const descriptor = Object.getOwnPropertyDescriptor(current, propertyName);

		if (descriptor) {
			return descriptor.writable === true || typeof descriptor.set === 'function';
		}

		current = Object.getPrototypeOf(current);
	}

	return false;
}

/**
 * Eagerly serializes a JSX child value to an HTML string.
 *
 * Used by `applyServerCustomElementChildren` to produce the inner HTML of a
 * custom element during SSR before `renderHostToString` is called.
 * This is a simplified serializer that does not emit hydration markers; for
 * full SSR output, use `renderToString` from the server-render module instead.
 *
 * @param value JSX child value to serialize.
 * @returns HTML string representing the child, with user-provided text content escaped.
 */
function renderJsxRenderableToString(value: JsxRenderable | undefined): string {
	if (value === undefined || value === null || value === false) {
		return '';
	}

	if (isKeyedJsxValue(value)) {
		return renderJsxRenderableToString(value.value);
	}

	if (isSubscribableJsxValue(value)) {
		return renderJsxRenderableToString(value.getValue());
	}

	if (isSignalLikeValue(value)) {
		return renderJsxRenderableToString(value.get());
	}

	if (typeof value === 'string') {
		return escapeHtml(value);
	}

	if (typeof value === 'number' || typeof value === 'bigint') {
		return String(value);
	}

	if (value === true) {
		return '';
	}

	if (isTemplateResultLike(value)) {
		const interpolationParts = getTemplateInterpolationParts(value.strings);
		let html = '';

		for (let index = 0; index < value.values.length; index += 1) {
			const interpolationPart = interpolationParts[index];
			let childValue: unknown = value.values[index];

			while (isKeyedJsxValue(childValue)) childValue = childValue.value;
			while (isSubscribableJsxValue(childValue)) childValue = childValue.getValue();
			while (isSignalLikeValue(childValue)) childValue = childValue.get();

			if (!interpolationPart || interpolationPart.type === 'child') {
				html +=
					interpolationPart && interpolationPart.type === 'child'
						? interpolationPart.string
						: (value.strings[index] ?? '');
				html += renderJsxRenderableToString(childValue as JsxRenderable);
				continue;
			}

			html += interpolationPart.leading;

			if (
				interpolationPart.prefix === '@' ||
				interpolationPart.prefix === '!' ||
				interpolationPart.prefix === '.'
			) {
				continue;
			}

			if (interpolationPart.prefix === '?') {
				if (childValue) {
					html += `${interpolationPart.whitespace}${interpolationPart.name}`;
				}
				continue;
			}

			if (childValue === undefined || childValue === null || childValue === false) {
				continue;
			}

			html += `${interpolationPart.whitespace}${interpolationPart.name}="${escapeAttribute(String(childValue))}"`;
		}

		html += value.strings[value.strings.length - 1] ?? '';
		return html;
	}

	if (isJsxNodeLike(value)) {
		if (typeof value.outerHTML === 'string') {
			return value.outerHTML;
		}

		if (Array.isArray(value.childNodes)) {
			return value.childNodes.map((child) => renderJsxNodeLikeToString(child)).join('');
		}

		return value.textContent ? escapeHtml(value.textContent) : '';
	}

	if (isIterableChild(value)) {
		let html = '';

		for (const child of value) {
			html += renderJsxRenderableToString(child as JsxRenderable);
		}

		return html;
	}

	return escapeHtml(String(value));
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

	if (isIterableChild(value)) {
		let rawText = '';

		for (const child of value) {
			rawText += renderJsxRenderableToRawText(child as JsxRenderable);
		}

		return rawText;
	}

	return escapeRawTextElementText(String(value));
}

function escapeRawTextElementText(value: string): string {
	return value.replace(/</g, '\\u003c');
}

/**
 * Serializes a {@link JsxNodeLike} value to an HTML string.
 *
 * Preference order:
 * 1. `outerHTML` string — returned as-is (assumed trusted/pre-escaped).
 * 2. `childNodes` array — each child is recursively serialized and concatenated.
 * 3. `textContent` — HTML-escaped and returned.
 *
 * @param value Node-like value to serialize.
 * @returns HTML string for the given node.
 */
function renderJsxNodeLikeToString(value: JsxNodeLike): string {
	if (typeof value.outerHTML === 'string') {
		return value.outerHTML;
	}

	if (Array.isArray(value.childNodes)) {
		return value.childNodes.map((child) => renderJsxNodeLikeToString(child)).join('');
	}

	return value.textContent ? escapeHtml(value.textContent) : '';
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
		Array.isArray((value as Partial<TemplateResultLike>).strings) &&
		Array.isArray((value as Partial<TemplateResultLike>).values)
	);
}

/**
 * Type guard that narrows `value` to {@link JsxNodeLike}.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` is an object with a `nodeType` property,
 *   consistent with the DOM `Node` interface and SSR node-like helpers.
 */
function isJsxNodeLike(value: unknown): value is JsxNodeLike {
	return typeof value === 'object' && value !== null && 'nodeType' in value;
}

/**
 * Returns whether a value carries internal keyed-child metadata.
 *
 * Renderer internals use this to unwrap keyed values without exposing keyed
 * wrapper details to application code.
 *
 * @param value Value to inspect.
 * @returns `true` when the value was produced from a keyed JSX child.
 */
export function isKeyedJsxValue(value: unknown): value is KeyedJsxValue {
	return typeof value === 'object' && value !== null && KEYED_VALUE_SYMBOL in value;
}

/**
 * Returns whether a value carries subscribable child metadata.
 *
 * @param value Value to inspect.
 * @returns `true` when the value can drive an independently subscribed child range.
 */
export function isSubscribableJsxValue(value: unknown): value is SubscribableJsxValue {
	return typeof value === 'object' && value !== null && SUBSCRIBABLE_JSX_VALUE_SYMBOL in value;
}

/**
 * Returns whether a value carries internal slot placeholder metadata.
 *
 * @param value Value to inspect.
 * @returns `true` when the value was produced from a literal `<slot>` JSX tag.
 */
export function isSlotJsxValue(value: unknown): value is SlotJsxValue {
	return typeof value === 'object' && value !== null && SLOT_JSX_VALUE_SYMBOL in value;
}

/**
 * Creates a subscribable JSX child value.
 *
 * Use this when a child binding should update from an external reactive source
 * without forcing the parent JSX tree to rerender. The server renderer reads
 * the current value synchronously, while the client renderer keeps the mounted
 * child range subscribed.
 *
 * Signal-like sources that already expose `get()` and `subscribe(...)` can be
 * passed directly as JSX children. This wrapper remains useful for sources that
 * do not already match that contract.
 *
 * @param config Subscription hooks that expose the current child value and
 * register future updates.
 * @returns A JSX renderable wrapper that the renderer can subscribe to directly.
 */
export function createSubscribableJsxValue<Value extends JsxRenderable>(config: {
	getValue: () => Value;
	subscribe: (notify: (value: Value) => void) => () => void;
}): SubscribableJsxValue<Value> {
	return {
		[SUBSCRIBABLE_JSX_VALUE_SYMBOL]: true,
		getValue: config.getValue,
		subscribe: config.subscribe,
	};
}

/**
 * Creates a lightweight node-like wrapper around trusted serialized markup.
 *
 * Use this when a caller already has final HTML and needs to hand it to the
 * JSX renderers without constructing a live DOM node first.
 */
export function createMarkupNodeLike(outerHTML: string): JsxNodeLike {
	return {
		nodeType: 1,
		outerHTML,
	};
}

function isSignalLikeValue(value: unknown): value is SignalLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as Partial<SignalLike>).get === 'function' &&
		typeof (value as Partial<SignalLike>).subscribe === 'function'
	);
}

/**
 * Iterates normalized JSX attributes and invokes `append` for each resolved name/value
 * pair. No intermediate record is created.
 *
 * Processing steps (in order):
 * 1. Merges `class` and `classes` into a single `class` string via
 *    {@link normalizeMergedClassValue}. The pair is omitted when both are empty.
 * 2. Skips `undefined` values, the `key` prop, and the class-family props.
 * 3. Expands `data` and `aria` objects into `data-*` / `aria-*` flat keys via
 *    {@link appendStructuredAttributes}.
 * 4. Serializes `style` objects to inline CSS strings via {@link normalizeStyleValue}.
 * 5. Passes all remaining attribute values to `append` unchanged.
 *
 * @param attributes Raw props object with `children` and `key` already removed.
 * @param append Callback invoked once per resolved attribute with its final name and value.
 */
function forEachNormalizedAttribute(
	attributes: Record<string, unknown>,
	append: (name: string, value: unknown) => void,
): void {
	const classValue = normalizeMergedClassValue(attributes.class, attributes.classes);

	if (classValue !== undefined) {
		append('class', classValue);
	}

	for (const name in attributes) {
		const value = attributes[name];

		if (value === undefined || name === 'key' || name === 'class' || name === 'classes') {
			continue;
		}

		if (name === 'data' || name === 'aria') {
			appendStructuredAttributes(name, value, append);
			continue;
		}

		if (name === 'style') {
			append('style', normalizeStyleValue(value));
			continue;
		}

		append(name, value);
	}
}

/**
 * Expands a structured `data` or `aria` object into flat `data-*` / `aria-*` attributes.
 *
 * Each key is converted to kebab-case before the prefix is prepended so that
 * camelCase property names (e.g. `{ labelledBy: 'x' }`) produce the correct
 * hyphenated attribute name (`aria-labelled-by`).
 *
 * No-ops when `value` is not a plain object.
 *
 * @param attributes Mutable target record to write expanded keys into.
 * @param prefix Either `'aria'` or `'data'`.
 * @param value The structured object to expand.
 */
function appendStructuredAttributes(
	prefix: 'aria' | 'data',
	value: unknown,
	append: (name: string, value: unknown) => void,
): void {
	if (!isPlainObject(value)) {
		return;
	}

	for (const name in value) {
		append(`${prefix}-${toKebabCase(name)}`, value[name]);
	}
}

/**
 * Appends a single attribute binding to the growing template string / value arrays.
 *
 * Encodes bindings using the runtime's template binding syntax so the client DOM
 * renderer can reconnect them after hydration:
 * - `on:*`  →  `!eventName=` for delegated allowlist entries, otherwise `@eventName=`
 * - `on-native:*`  →  `@eventName=` (always direct element listener binding)
 * - `prop:*` →  `.propertyName=` (property binding)
 * - `boolean` →  `?attrName=` (boolean attribute binding)
 * - all other values →  `attrName=` (standard attribute binding)
 *
 * `undefined` values are silently skipped so optional props do not emit
 * extraneous attribute strings.
 *
 * @param strings Mutable array of static HTML string segments.
 * @param values Mutable array of dynamic binding values.
 * @param name Normalized attribute name.
 * @param value Attribute value to bind.
 */
function appendBinding(strings: string[], values: unknown[], name: string, value: unknown): void {
	if (value === undefined) {
		return;
	}

	const bindingShapeValue = resolveBindingShapeValue(value);

	if (name.startsWith('on-native:')) {
		strings[strings.length - 1] += ` @${name.slice('on-native:'.length)}=`;
		values.push(value);
		strings.push('');
		return;
	}

	if (name.startsWith('on:')) {
		const eventName = name.slice(3);
		strings[strings.length - 1] += shouldDelegateEventBinding(eventName) ? ` !${eventName}=` : ` @${eventName}=`;
		values.push(value);
		strings.push('');
		return;
	}

	if (name.startsWith('prop:')) {
		strings[strings.length - 1] += ` .${name.slice(5)}=`;
		values.push(value);
		strings.push('');
		return;
	}

	if (typeof bindingShapeValue === 'boolean' && shouldUseBooleanAttributeBinding(name)) {
		strings[strings.length - 1] += ` ?${name}=`;
		values.push(value);
		strings.push('');
		return;
	}

	strings[strings.length - 1] += ` ${name}=`;
	values.push(value);
	strings.push('');
}

/**
 * Appends JSX children onto the template string / value arrays.
 *
 * In `'multiple'` mode (`jsxs`), an iterable `children` value is iterated
 * directly so each sibling child becomes its own dynamic slot. In `'single'`
 * mode (`jsx`), iterables are first flattened then pushed as a single slot so
 * the renderer receives them as a cohesive child group.
 *
 * Falsy leaf values (`undefined`, `null`, `false`) are omitted entirely.
 *
 * @param strings Mutable array of static HTML string segments.
 * @param values Mutable array of dynamic binding values.
 * @param children JSX children to append.
 * @param childSlotMode Determines iteration strategy for iterable children.
 */
function appendChildren(
	strings: string[],
	values: unknown[],
	children: JsxRenderable | undefined,
	childSlotMode: ChildSlotMode,
): void {
	if (children === undefined || children === null || children === false) {
		return;
	}

	if (!isIterableChild(children)) {
		values.push(normalizeChildren(children));
		strings.push('');
		return;
	}

	if (childSlotMode === 'multiple') {
		for (const child of children) {
			const normalizedChild = normalizeChildSlot(child as JsxRenderable);

			if (normalizedChild === undefined) {
				continue;
			}

			values.push(normalizedChild);
			strings.push('');
		}
		return;
	}

	const flattenedChildren = flattenChildren(children);

	if (flattenedChildren.length === 0) {
		return;
	}

	values.push(flattenedChildren as JsxRenderable);
	strings.push('');
}

/**
 * Normalizes a `children` prop value respecting the active child-slot mode.
 *
 * In `'multiple'` mode, iterable children are mapped through
 * {@link normalizeChildSlot}, filtered for defined slots, and returned as a
 * single-element or multi-element array. In `'single'` mode the value is
 * passed directly to {@link normalizeChildren}.
 *
 * @param children Raw `children` prop value.
 * @param childSlotMode Controls how iterable children are handled.
 * @returns Normalized JSX renderable ready to be returned from a fragment or component.
 */
function normalizeChildrenWithMode(children: JsxRenderable | undefined, childSlotMode: ChildSlotMode): JsxRenderable {
	if (childSlotMode === 'multiple' && isIterableChild(children)) {
		const slots: JsxRenderable[] = [];

		for (const child of children) {
			const normalizedChild = normalizeChildSlot(child as JsxRenderable);

			if (normalizedChild !== undefined) {
				slots.push(normalizedChild);
			}
		}

		if (slots.length === 0) {
			return '';
		}

		if (slots.length === 1) {
			return slots[0];
		}

		return slots;
	}

	return normalizeChildren(children);
}

function resolveBindingShapeValue(value: unknown): unknown {
	if (isSubscribableJsxValue(value)) {
		return resolveBindingShapeValue(value.getValue());
	}

	if (isSignalLikeValue(value)) {
		return resolveBindingShapeValue(value.get());
	}

	return value;
}

const htmlBooleanAttributes = new Set([
	'allowfullscreen',
	'async',
	'autofocus',
	'autoplay',
	'checked',
	'controls',
	'default',
	'defer',
	'disabled',
	'formnovalidate',
	'hidden',
	'inert',
	'ismap',
	'itemscope',
	'loop',
	'multiple',
	'muted',
	'novalidate',
	'open',
	'playsinline',
	'readonly',
	'required',
	'reversed',
	'selected',
]);

function shouldUseBooleanAttributeBinding(name: string): boolean {
	return htmlBooleanAttributes.has(name);
}

/**
 * Normalizes a single positional child slot value.
 *
 * Returns `undefined` for falsy leaf values and empty iterable groups so that
 * callers can safely filter absent slots. Iterable children are recursively
 * flattened before being wrapped as an array.
 *
 * @param child Raw child value from a positional slot.
 * @returns Normalized child renderable, or `undefined` when the slot is empty.
 */
function normalizeChildSlot(child: JsxRenderable | undefined): JsxRenderable | undefined {
	if (child === undefined || child === null || child === false) {
		return undefined;
	}

	if (!isIterableChild(child)) {
		return child;
	}

	const flattenedChildren = flattenChildren(child);
	return flattenedChildren.length === 0 ? undefined : (flattenedChildren as JsxRenderable);
}

/**
 * Recursively flattens a JSX child value into a flat array of leaf values.
 *
 * Falsy leaves (`undefined`, `null`, `false`) are dropped. Iterable children
 * are recursively expanded depth-first so the result is always a one-dimensional
 * array of non-iterable child values.
 *
 * @param children JSX child value to flatten.
 * @returns Flat array of non-iterable child values.
 */
function flattenChildren(children: JsxRenderable | undefined): unknown[] {
	const flattenedChildren: unknown[] = [];
	appendFlattenedChildren(flattenedChildren, children);
	return flattenedChildren;
}

/**
 * Appends the leaf values from `children` into an existing flat accumulator.
 *
 * This avoids allocating intermediate arrays at each recursion level when
 * flattening nested iterable child structures.
 *
 * @param flattenedChildren Mutable accumulator receiving flattened child values.
 * @param children JSX child value to flatten into the accumulator.
 */
function appendFlattenedChildren(flattenedChildren: unknown[], children: JsxRenderable | undefined): void {
	if (children === undefined || children === null || children === false) {
		return;
	}

	if (isIterableChild(children)) {
		for (const child of children) {
			appendFlattenedChildren(flattenedChildren, child as JsxRenderable);
		}
		return;
	}

	flattenedChildren.push(children);
}

/**
 * Normalizes a JSX child value by flattening it and unwrapping trivial arrays.
 *
 * - Empty → returns `''` (an empty string that the renderer treats as no-op).
 * - Single element → unwrapped from its array container.
 * - Multiple elements → returned as an array.
 *
 * @param children JSX child value to normalize.
 * @returns Normalized {@link JsxRenderable}.
 */
function normalizeChildren(children: JsxRenderable | undefined): JsxRenderable {
	if (children === undefined || children === null || children === false) {
		return '';
	}

	if (!isIterableChild(children)) {
		return children;
	}

	const flattenedChildren = flattenChildren(children);

	if (flattenedChildren.length === 0) {
		return '';
	}

	if (flattenedChildren.length === 1) {
		return flattenedChildren[0] as JsxRenderable;
	}

	return flattenedChildren as JsxRenderable;
}

/**
 * Merges the `class` and `classes` JSX props into a single
 * space-separated class string.
 *
 * `class` is treated as a plain string token. `classes` is processed by
 * {@link appendClassTokens}, which understands strings, numbers, arrays,
 * and conditional objects (`{ token: boolean }`).
 *
 * @param classValue Value of the `class` prop.
 * @param classesValue Value of the `classes` prop.
 * @returns Merged class string, or `undefined` when both resolve to no tokens.
 */
function normalizeMergedClassValue(classValue: unknown, classesValue: unknown): string | undefined {
	const tokens: string[] = [];
	appendClassTokens(tokens, classValue);
	appendClassTokens(tokens, classesValue);
	return tokens.length === 0 ? undefined : tokens.join(' ');
}

/**
 * Recursively collects class token strings from a single raw class value.
 *
 * Supported value shapes:
 * - `string` — added as-is (non-empty only).
 * - `number` / `bigint` — coerced to string and added.
 * - `Array` — each element is recursively processed.
 * - Plain object — keys whose values are truthy are added as tokens.
 * - `undefined`, `null`, `true`, `false` — silently skipped.
 *
 * @param tokens Mutable accumulator array to push discovered tokens into.
 * @param value Single raw class value to process.
 */
function appendClassTokens(tokens: string[], value: unknown): void {
	if (value === undefined || value === null || value === false || value === true) {
		return;
	}

	if (typeof value === 'string') {
		if (value !== '') {
			tokens.push(value);
		}
		return;
	}

	if (typeof value === 'number' || typeof value === 'bigint') {
		tokens.push(String(value));
		return;
	}

	if (Array.isArray(value)) {
		for (const entry of value) {
			appendClassTokens(tokens, entry);
		}
		return;
	}

	if (!isPlainObject(value)) {
		return;
	}

	for (const [name, enabled] of Object.entries(value)) {
		if (enabled) {
			tokens.push(name);
		}
	}
}

/**
 * Serializes a `style` prop value to an inline CSS string.
 *
 * When `value` is a plain object, each entry is converted to a
 * `property: value` declaration where the property name is converted from
 * camelCase to kebab-case. Entries with `undefined`, `null`, or empty-string
 * values are omitted. Declarations are joined with `'; '`.
 *
 * Non-object values (e.g. an already-serialized CSS string) are returned
 * unchanged.
 *
 * @param value Raw style prop value.
 * @returns Inline CSS string, or the original value when it is not a plain object.
 */
function normalizeStyleValue(value: unknown): unknown {
	if (!isPlainObject(value)) {
		return value;
	}

	const declarations: string[] = [];

	for (const [name, entry] of Object.entries(value)) {
		if (entry === undefined || entry === null || entry === '') {
			continue;
		}

		declarations.push(`${toKebabCase(name)}: ${String(entry)}`);
	}

	return declarations.join('; ');
}

/**
 * Constructs a {@link TemplateResultLike} from static string segments and
 * dynamic binding values.
 *
 * The `strings` array is frozen into a proper `TemplateStringsArray` (with a
 * matching `raw` property) via {@link toTemplateStrings}.
 *
 * @param strings Static HTML string segments.
 * @param values Dynamic binding values interleaved between the string segments.
 * @returns A frozen, Radiant-compatible template result.
 */
function createTemplateResult(strings: string[], values: unknown[], rootLocalName: string): TemplateResultLike {
	return {
		[RADIANT_TEMPLATE_RESULT_FIELD]: RADIANT_TEMPLATE_RESULT,
		rootLocalName,
		strings: toTemplateStrings(strings),
		values,
	};
}

/**
 * Wraps a JSX renderable with keyed reconciliation metadata when a valid key is
 * provided, otherwise returns the value unchanged.
 *
 * Only `string` and `number` keys are accepted; any other type is treated as
 * absent so the runtime does not carry keyed wrappers for elements whose `key`
 * prop was omitted or set to a non-primitive.
 *
 * @param value JSX renderable to wrap.
 * @param key Raw `key` prop value from the JSX renderable's props.
 * @returns A {@link KeyedJsxValue} when `key` is a valid string or number, otherwise `value` as-is.
 */
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

/**
 * Converts a plain string array into a frozen `TemplateStringsArray`.
 *
 * The DOM and SSR renderers expect the `strings` field to conform to the
 * frozen, non-enumerable-`raw` contract of a tagged template literal. This
 * helper adds a writable-false `raw` property that mirrors the cooked array
 * so interpolated values are handled identically to native template literals.
 *
 * @param strings Mutable array of static HTML string segments.
 * @returns A frozen `TemplateStringsArray` with a matching `raw` property.
 */
function toTemplateStrings(strings: string[]): TemplateStringsArray {
	const templateStrings = [...strings] as unknown as TemplateStringsArray;
	Object.defineProperty(templateStrings, 'raw', {
		value: [...strings],
		writable: false,
	});
	return templateStrings;
}

/**
 * Returns `true` when `value` is a non-null, non-array plain object.
 *
 * Used to distinguish `style` objects and `data`/`aria` objects from
 * primitives, arrays, and class instances in the attribute normalization path.
 *
 * @param value Value to inspect.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns `true` when `value` is an iterable JSX child (i.e., an array or any
 * other iterable that is not a string or function).
 *
 * Strings are excluded because they are iterable by character but must be
 * treated as atomic text nodes. Functions are excluded because they are not
 * valid standalone iterables in the JSX child position.
 *
 * @param value JSX child value to test.
 */
function isIterableChild(value: JsxRenderable): value is Iterable<JsxRenderable> {
	return typeof value !== 'string' && typeof value !== 'function' && Symbol.iterator in Object(value);
}

/**
 * Converts a camelCase identifier to kebab-case for use in HTML attribute names
 * and CSS property names.
 *
 * @example `toKebabCase('backgroundColor')` → `'background-color'`
 *
 * @param value camelCase input string.
 * @returns Kebab-case output string.
 */
function toKebabCase(value: string): string {
	return value.replace(/[A-Z]/g, (segment) => `-${segment.toLowerCase()}`);
}
