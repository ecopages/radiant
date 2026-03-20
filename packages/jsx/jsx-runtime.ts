const RADIANT_TEMPLATE_RESULT = 1;
const LEGACY_TEMPLATE_RESULT_FIELD = '_$litType$';
const RADIANT_TEMPLATE_RESULT_FIELD = '_$rType$';
const KEYED_VALUE_SYMBOL = Symbol.for('@ecopages/jsx.keyed-value');
const SUBSCRIBABLE_JSX_VALUE_SYMBOL = Symbol.for('@ecopages/jsx.subscribable-value');
const FORCE_SERVER_CUSTOM_ELEMENT_RENDER_SYMBOL = Symbol.for('@ecopages/jsx.force-server-custom-element-render');
const ACTIVE_SSR_HYDRATE_SYMBOL = Symbol.for('@ecopages/jsx.active-ssr-hydrate');

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

const fragmentSymbol = Symbol.for('@ecopages/jsx.fragment');

import { escapeHtml } from './html-escape';

/**
 * A primitive child value that the Radiant renderer can mount directly.
 */
export type JsxPrimitive = boolean | bigint | number | null | string | undefined;

/**
 * A Radiant template result produced by the JSX runtime.
 *
 * The runtime keeps the Radiant marker on `_$rType$` and also writes the
 * legacy Lit-compatible marker so existing detection paths can continue to
 * recognize template results during the transition.
 */
export interface TemplateResultLike {
	/** Stable Radiant template marker consumed by the client and server renderers. */
	readonly ['_$rType$']: typeof RADIANT_TEMPLATE_RESULT;
	/** Legacy compatibility marker preserved for existing Lit-style checks. */
	readonly ['_$litType$']?: typeof RADIANT_TEMPLATE_RESULT;
	/** Static HTML segments emitted by the JSX transform. */
	readonly strings: TemplateStringsArray;
	/** Dynamic values interpolated between the static string segments. */
	readonly values: readonly unknown[];
}

/**
 * A lightweight node-like value that can be serialized on the server.
 *
 * This is primarily used by SSR helpers that can provide final HTML without
 * constructing a real DOM node in the current environment.
 */
export interface JsxNodeLike {
	/** Optional serialized child nodes when `outerHTML` is not provided directly. */
	childNodes?: JsxNodeLike[];
	/** DOM-like node type identifier. */
	nodeType: number;
	/** Serialized HTML for element-like values. */
	outerHTML?: string;
	/** Serialized text content for text-like values. */
	textContent?: string | null;
}

/**
 * Stable identity used to preserve ownership of a child value across keyed
 * list updates.
 *
 * Keys are runtime metadata only and are never emitted into the DOM or SSR
 * output directly.
 */
export type JsxKey = number | string;

/**
 * Internal wrapper for a JSX value that carries keyed-child metadata.
 *
 * The current renderer treats keyed values as transparent wrappers. Future
 * reconciliation layers use this shape to decide whether a child subtree may be
 * reused instead of recreated.
 */
export interface KeyedJsxValue {
	readonly key: JsxKey;
	readonly value: JsxElement;
	readonly [KEYED_VALUE_SYMBOL]: true;
}

/**
 * A JSX child value backed by an external subscription source.
 *
 * The server renderer resolves the current value eagerly, while the client DOM
 * renderer keeps the mounted child range subscribed so later updates can patch
 * that range directly without requiring a parent rerender.
 */
export interface SubscribableJsxValue {
	readonly [SUBSCRIBABLE_JSX_VALUE_SYMBOL]: true;
	getValue: () => JsxElement;
	subscribe: (notify: (value: JsxElement) => void) => () => void;
}

/**
 * A value that can be returned from a JSX component.
 *
 * Wrapper values such as keyed and subscribable children are transparent to the
 * renderer. They carry reconciliation or subscription metadata while still
 * behaving like regular child content.
 */
export type JsxChild =
	| JsxPrimitive
	| JsxNodeLike
	| KeyedJsxValue
	| Node
	| SubscribableJsxValue
	| TemplateResultLike
	| Iterable<JsxChild>;

/**
 * Props received by a JSX component.
 *
 * The runtime reserves `children` for nested JSX content and allows arbitrary
 * additional keys so intrinsic bindings and component-specific props can share
 * the same shape.
 */
export type JsxComponentProps = {
	children?: JsxChild;
	[key: string]: unknown;
};

/**
 * A function component supported by the Radiant JSX runtime.
 */
export type JsxComponent<Props extends JsxComponentProps = JsxComponentProps> = (props: Props) => JsxElement;

/**
 * A value returned from `jsx`, `jsxs`, or a function component.
 *
 * `JsxElement` is intentionally broader than a DOM node. It includes primitive
 * content, template results, iterable child collections, and renderer-specific
 * wrappers such as keyed and subscribable values.
 */
export type JsxElement = JsxChild;

/**
 * Internal fragment marker type used by the automatic JSX runtime.
 */
export type JsxFragment = typeof fragmentSymbol;

type Booleanish = boolean | 'true' | 'false';
type StringKeyOf<Value> = Extract<keyof Value, string>;
type JsxBindablePropertyName<ElementType extends object> = {
	[PropertyName in StringKeyOf<ElementType>]: ElementType[PropertyName] extends (...args: any[]) => any
		? never
		: PropertyName;
}[StringKeyOf<ElementType>];

/**
 * Bivariant event handler type for native DOM events.
 */
export type JsxEventHandler<EventType extends Event = Event, CurrentTarget extends EventTarget = EventTarget> = {
	bivarianceHack(event: EventType & { readonly currentTarget: CurrentTarget }): void;
}['bivarianceHack'];

/**
 * Object-style DOM event listener.
 */
export interface JsxEventListenerObject<EventType extends Event = Event> {
	handleEvent(event: EventType): void;
}

/**
 * Accepted value for `on:*` bindings.
 */
export type JsxEventListener<EventType extends Event = Event, CurrentTarget extends EventTarget = EventTarget> =
	| JsxEventHandler<EventType, CurrentTarget>
	| JsxEventListenerObject<EventType>;

type JsxEventBindings<ElementType extends EventTarget> = {
	[EventName in keyof GlobalEventHandlersEventMap as `on:${EventName}`]?: JsxEventListener<
		GlobalEventHandlersEventMap[EventName],
		ElementType
	>;
} & {
	[eventName: `on:${string}`]: JsxEventListener<Event, ElementType> | undefined;
};

type JsxPropertyBindings<ElementType extends object> = {
	[PropertyName in JsxBindablePropertyName<ElementType> as `prop:${PropertyName}`]?: ElementType[PropertyName];
} & {
	[propertyName: `prop:${string}`]: unknown;
};

/*
 * All the WAI-ARIA 1.1 attributes from https://www.w3.org/TR/wai-aria-1.1/
 */
export interface AriaAttributesNormalized {
	/** Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application. */
	activedescendant?: string | undefined;
	/** Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. */
	atomic?: Booleanish | undefined;
	/**
	 * Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be
	 * presented if they are made.
	 */
	autocomplete?: 'none' | 'inline' | 'list' | 'both' | undefined;
	/** Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are complete before exposing them to the user. */
	/**
	 * Defines a string value that labels the current element, which is intended to be converted into Braille.
	 * @see aria-label.
	 */
	braillelabel?: string | undefined;
	/**
	 * Defines a human-readable, author-localized abbreviated description for the role of an element, which is intended to be converted into Braille.
	 * @see aria-roledescription.
	 */
	brailleroledescription?: string | undefined;
	busy?: Booleanish | undefined;
	/**
	 * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
	 * @see aria-pressed @see aria-selected.
	 */
	checked?: boolean | 'false' | 'mixed' | 'true' | undefined;
	/**
	 * Defines the total number of columns in a table, grid, or treegrid.
	 * @see aria-colindex.
	 */
	colcount?: number | undefined;
	/**
	 * Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid.
	 * @see aria-colcount @see aria-colspan.
	 */
	colindex?: number | undefined;
	/**
	 * Defines a human readable text alternative of aria-colindex.
	 * @see aria-rowindextext.
	 */
	colindextext?: string | undefined;
	/**
	 * Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.
	 * @see aria-colindex @see aria-rowspan.
	 */
	colspan?: number | undefined;
	/**
	 * Identifies the element (or elements) whose contents or presence are controlled by the current element.
	 * @see aria-owns.
	 */
	controls?: string | undefined;
	/** Indicates the element that represents the current item within a container or set of related elements. */
	current?: boolean | 'false' | 'true' | 'page' | 'step' | 'location' | 'date' | 'time' | undefined;
	/**
	 * Identifies the element (or elements) that describes the object.
	 * @see aria-labelledby
	 */
	describedby?: string | undefined;
	/**
	 * Defines a string value that describes or annotates the current element.
	 * @see related aria-describedby.
	 */
	description?: string | undefined;
	/**
	 * Identifies the element that provides a detailed, extended description for the object.
	 * @see aria-describedby.
	 */
	details?: string | undefined;
	/**
	 * Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.
	 * @see aria-hidden @see aria-readonly.
	 */
	disabled?: Booleanish | undefined;
	/**
	 * Indicates what functions can be performed when a dragged object is released on the drop target.
	 * @deprecated in ARIA 1.1
	 */
	dropeffect?: 'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup' | undefined;
	/**
	 * Identifies the element that provides an error message for the object.
	 * @see aria-invalid @see aria-describedby.
	 */
	errormessage?: string | undefined;
	/** Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. */
	expanded?: Booleanish | undefined;
	/**
	 * Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion,
	 * allows assistive technology to override the general default of reading in document source order.
	 */
	flowto?: string | undefined;
	/**
	 * Indicates an element's "grabbed" state in a drag-and-drop operation.
	 * @deprecated in ARIA 1.1
	 */
	grabbed?: Booleanish | undefined;
	/** Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. */
	haspopup?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' | undefined;
	/**
	 * Indicates whether the element is exposed to an accessibility API.
	 * @see aria-disabled.
	 */
	hidden?: Booleanish | undefined;
	/**
	 * Indicates the entered value does not conform to the format expected by the application.
	 * @see aria-errormessage.
	 */
	invalid?: boolean | 'false' | 'true' | 'grammar' | 'spelling' | undefined;
	/** Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element. */
	keyshortcuts?: string | undefined;
	/**
	 * Defines a string value that labels the current element.
	 * @see aria-labelledby.
	 */
	label?: string | undefined;
	/**
	 * Identifies the element (or elements) that labels the current element.
	 * @see aria-describedby.
	 */
	labelledby?: string | undefined;
	/** Defines the hierarchical level of an element within a structure. */
	level?: number | undefined;
	/** Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region. */
	live?: 'off' | 'assertive' | 'polite' | undefined;
	/** Indicates whether an element is modal when displayed. */
	modal?: Booleanish | undefined;
	/** Indicates whether a text box accepts multiple lines of input or only a single line. */
	multiline?: Booleanish | undefined;
	/** Indicates that the user may select more than one item from the current selectable descendants. */
	multiselectable?: Booleanish | undefined;
	/** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
	orientation?: 'horizontal' | 'vertical' | undefined;
	/**
	 * Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship
	 * between DOM elements where the DOM hierarchy cannot be used to represent the relationship.
	 * @see aria-controls.
	 */
	owns?: string | undefined;
	/**
	 * Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value.
	 * A hint could be a sample value or a brief description of the expected format.
	 */
	placeholder?: string | undefined;
	/**
	 * Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
	 * @see aria-setsize.
	 */
	posinset?: number | undefined;
	/**
	 * Indicates the current "pressed" state of toggle buttons.
	 * @see aria-checked @see aria-selected.
	 */
	pressed?: boolean | 'false' | 'mixed' | 'true' | undefined;
	/**
	 * Indicates that the element is not editable, but is otherwise operable.
	 * @see aria-disabled.
	 */
	readonly?: Booleanish | undefined;
	/**
	 * Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.
	 * @see aria-atomic.
	 */
	relevant?:
		| 'additions'
		| 'additions removals'
		| 'additions text'
		| 'all'
		| 'removals'
		| 'removals additions'
		| 'removals text'
		| 'text'
		| 'text additions'
		| 'text removals'
		| undefined;
	/** Indicates that user input is required on the element before a form may be submitted. */
	required?: Booleanish | undefined;
	/** Defines a human-readable, author-localized description for the role of an element. */
	roledescription?: string | undefined;
	/**
	 * Defines the total number of rows in a table, grid, or treegrid.
	 * @see aria-rowindex.
	 */
	rowcount?: number | undefined;
	/**
	 * Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.
	 * @see aria-rowcount @see aria-rowspan.
	 */
	rowindex?: number | undefined;
	/**
	 * Defines a human readable text alternative of aria-rowindex.
	 * @see aria-colindextext.
	 */
	rowindextext?: string | undefined;
	/**
	 * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
	 * @see aria-rowindex @see aria-colspan.
	 */
	rowspan?: number | undefined;
	/**
	 * Indicates the current "selected" state of various widgets.
	 * @see aria-checked @see aria-pressed.
	 */
	selected?: Booleanish | undefined;
	/**
	 * Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
	 * @see aria-posinset.
	 */
	setsize?: number | undefined;
	/** Indicates if items in a table or grid are sorted in ascending or descending order. */
	sort?: 'none' | 'ascending' | 'descending' | 'other' | undefined;
	/** Defines the maximum allowed value for a range widget. */
	valuemax?: number | undefined;
	/** Defines the minimum allowed value for a range widget. */
	valuemin?: number | undefined;
	/**
	 * Defines the current value for a range widget.
	 * @see aria-valuetext.
	 */
	valuenow?: number | undefined;
	/** Defines the human readable text alternative of aria-valuenow for a range widget. */
	valuetext?: string | undefined;
}

/**
 * Alias for normalized ARIA authoring values.
 */
export type AriaTypeNormalized = AriaAttributesNormalized;

/**
 * Shared attribute shape for intrinsic elements.
 */
export interface JsxSharedIntrinsicAttributes {
	aria?: Partial<AriaAttributesNormalized> | undefined;
	children?: JsxChild;
	class?: unknown;
	className?: unknown;
	classes?: unknown;
	data?: Record<string, unknown>;
	style?: Record<string, unknown> | string;
	[key: string]: unknown;
}

/**
 * Shared attribute shape for intrinsic elements.
 */
export type JsxIntrinsicAttributes<ElementType extends Element = Element> = JsxSharedIntrinsicAttributes &
	JsxEventBindings<ElementType> &
	JsxPropertyBindings<ElementType>;

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
export function jsx<Props extends JsxComponentProps>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
): JsxElement {
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
export function jsxs<Props extends JsxComponentProps>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
): JsxElement {
	return createJsxElement(type, props, 'multiple');
}

type ChildSlotMode = 'multiple' | 'single';

/**
 * Type information consumed by TypeScript when `jsxImportSource` points at this package.
 */
export namespace JSX {
	export type Element = JsxElement;
	export type ElementType = string | JsxFragment | JsxComponent<any>;

	export interface ElementChildrenAttribute {
		children: {};
	}

	export interface IntrinsicAttributes {
		key?: JsxKey;
	}

	export type IntrinsicElements = JsxDomIntrinsicElements & {
		[elementName: string]: JsxIntrinsicAttributes<globalThis.Element>;
	};
}

function createJsxElement<Props extends JsxComponentProps>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
	childSlotMode: ChildSlotMode,
): JsxElement {
	const keyedValue = props.key;

	if (typeof type === 'function') {
		return wrapKeyedValue(type(props), keyedValue);
	}

	if (type === fragmentSymbol) {
		return wrapKeyedValue(normalizeChildrenWithMode(props.children, childSlotMode), keyedValue);
	}

	const serverRenderedCustomElement = createServerRenderedCustomElement(type, props);

	if (serverRenderedCustomElement) {
		return wrapKeyedValue(serverRenderedCustomElement, keyedValue);
	}

	const strings = [`<${type}`];
	const values: unknown[] = [];
	const { children, ...rawAttributes } = props;
	const normalizedAttributes = normalizeAttributes(rawAttributes);

	for (const [name, value] of Object.entries(normalizedAttributes)) {
		appendBinding(strings, values, name, value);
	}

	if (voidElementNames.has(type)) {
		strings[strings.length - 1] += '>';
		return wrapKeyedValue(createTemplateResult(strings, values), keyedValue);
	}

	strings[strings.length - 1] += '>';
	appendChildren(strings, values, children, childSlotMode);
	strings[strings.length - 1] += `</${type}>`;

	return wrapKeyedValue(createTemplateResult(strings, values), keyedValue);
}

type ServerRenderableCustomElement = {
	renderHostToString: (options?: { hydrate?: boolean }) => string;
	setAttribute?: (name: string, value: unknown) => void;
	removeAttribute?: (name: string) => void;
	[propertyName: string]: unknown;
};

function createServerRenderedCustomElement<Props extends JsxComponentProps>(
	type: string,
	props: Props,
): JsxNodeLike | undefined {
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

	const { children, key: _key, ...rawAttributes } = props;
	const normalizedAttributes = normalizeAttributes(rawAttributes);
	applyServerCustomElementAttributes(instance, normalizedAttributes);
	applyServerCustomElementChildren(instance, children);

	return {
		nodeType: 1,
		get outerHTML() {
			return instance.renderHostToString({ hydrate: getActiveSsrHydrateMode() });
		},
	};
}

function getActiveSsrHydrateMode(): boolean {
	return (globalThis as typeof globalThis & Record<PropertyKey, unknown>)[ACTIVE_SSR_HYDRATE_SYMBOL] === true;
}

function shouldServerRenderCustomElement(type: string): boolean {
	return (
		type.includes('-') &&
		(typeof document === 'undefined' ||
			(globalThis as typeof globalThis & Record<PropertyKey, unknown>)[
				FORCE_SERVER_CUSTOM_ELEMENT_RENDER_SYMBOL
			] === true)
	);
}

function isServerRenderableCustomElement(value: unknown): value is ServerRenderableCustomElement {
	return typeof value === 'object' && value !== null && 'renderHostToString' in value;
}

function applyServerCustomElementAttributes(
	element: ServerRenderableCustomElement,
	attributes: Record<string, unknown>,
): void {
	for (const [name, value] of Object.entries(attributes)) {
		if (value === undefined || name.startsWith('on:')) {
			continue;
		}

		if (name.startsWith('prop:')) {
			element[name.slice(5)] = value;
			continue;
		}

		if (name in element && !name.includes('-')) {
			element[name] = value;
			continue;
		}

		if (typeof value === 'boolean') {
			if (value) {
				element.setAttribute?.(name, '');
			} else {
				element.removeAttribute?.(name);
			}
			continue;
		}

		element.setAttribute?.(name, String(value));
	}
}

function applyServerCustomElementChildren(
	element: ServerRenderableCustomElement,
	children: JsxChild | undefined,
): void {
	if (children === undefined || !('children' in element || 'innerHTML' in element)) {
		return;
	}

	const serializedChildren = renderJsxChildToString(children);

	if ('children' in element) {
		element.children = serializedChildren;
	}

	if ('innerHTML' in element) {
		element.innerHTML = serializedChildren;
	}
}

function renderJsxChildToString(value: JsxChild | undefined): string {
	if (value === undefined || value === null || value === false) {
		return '';
	}

	if (isKeyedJsxValue(value)) {
		return renderJsxChildToString(value.value);
	}

	if (isSubscribableJsxValue(value)) {
		return renderJsxChildToString(value.getValue());
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
		let html = '';

		for (let index = 0; index < value.values.length; index += 1) {
			html += value.strings[index] ?? '';
			html += renderJsxChildToString(value.values[index] as JsxChild);
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
			html += renderJsxChildToString(child as JsxChild);
		}

		return html;
	}

	return escapeHtml(String(value));
}

function renderJsxNodeLikeToString(value: JsxNodeLike): string {
	if (typeof value.outerHTML === 'string') {
		return value.outerHTML;
	}

	if (Array.isArray(value.childNodes)) {
		return value.childNodes.map((child) => renderJsxNodeLikeToString(child)).join('');
	}

	return value.textContent ? escapeHtml(value.textContent) : '';
}

function isTemplateResultLike(value: unknown): value is TemplateResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		((value as { ['_$rType$']?: unknown })['_$rType$'] === 1 ||
			(value as { ['_$litType$']?: unknown })['_$litType$'] === 1) &&
		Array.isArray((value as Partial<TemplateResultLike>).strings) &&
		Array.isArray((value as Partial<TemplateResultLike>).values)
	);
}

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
 * Creates a subscribable JSX child value.
 *
 * Use this when a child binding should update from an external reactive source
 * without forcing the parent JSX tree to rerender. The server renderer reads
 * the current value synchronously, while the client renderer keeps the mounted
 * child range subscribed.
 *
 * @param config Subscription hooks that expose the current child value and
 * register future updates.
 * @returns A JSX child wrapper that the renderer can subscribe to directly.
 */
export function createSubscribableJsxValue(config: {
	getValue: () => JsxElement;
	subscribe: (notify: (value: JsxElement) => void) => () => void;
}): SubscribableJsxValue {
	return {
		[SUBSCRIBABLE_JSX_VALUE_SYMBOL]: true,
		getValue: config.getValue,
		subscribe: config.subscribe,
	};
}

function normalizeAttributes(attributes: Record<string, unknown>): Record<string, unknown> {
	const normalized: Record<string, unknown> = {};
	const classValue = normalizeClassList([attributes.class, attributes.className, attributes.classes]);

	if (classValue !== undefined) {
		normalized.class = classValue;
	}

	for (const [name, value] of Object.entries(attributes)) {
		if (value === undefined || name === 'key' || name === 'class' || name === 'className' || name === 'classes') {
			continue;
		}

		if (name === 'data' || name === 'aria') {
			appendStructuredAttributes(normalized, name, value);
			continue;
		}

		if (name === 'style') {
			normalized.style = normalizeStyleValue(value);
			continue;
		}

		normalized[name] = normalizeAttributeValue(name, value);
	}

	return normalized;
}

function appendStructuredAttributes(
	attributes: Record<string, unknown>,
	prefix: 'aria' | 'data',
	value: unknown,
): void {
	if (!isPlainObject(value)) {
		return;
	}

	for (const [name, entry] of Object.entries(value)) {
		attributes[`${prefix}-${toKebabCase(name)}`] = entry;
	}
}

function appendBinding(strings: string[], values: unknown[], name: string, value: unknown): void {
	if (value === undefined) {
		return;
	}

	if (name.startsWith('on:')) {
		strings[strings.length - 1] += ` @${name.slice(3)}=`;
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

	if (typeof value === 'boolean') {
		strings[strings.length - 1] += ` ?${name}=`;
		values.push(value);
		strings.push('');
		return;
	}

	strings[strings.length - 1] += ` ${name}=`;
	values.push(value);
	strings.push('');
}

function appendChildren(
	strings: string[],
	values: unknown[],
	children: JsxChild | undefined,
	childSlotMode: ChildSlotMode,
): void {
	if (children === undefined || children === null || children === false) {
		return;
	}

	if (childSlotMode === 'multiple' && isIterableChild(children)) {
		for (const child of children) {
			const normalizedChild = normalizeChildSlot(child as JsxChild);

			if (normalizedChild === undefined) {
				continue;
			}

			values.push(normalizedChild);
			strings.push('');
		}
		return;
	}

	if (isIterableChild(children)) {
		const flattenedChildren = flattenChildren(children);

		if (flattenedChildren.length === 0) {
			return;
		}

		values.push(flattenedChildren as JsxElement);
		strings.push('');
		return;
	}

	values.push(normalizeChildren(children));
	strings.push('');
}

function normalizeChildrenWithMode(children: JsxChild | undefined, childSlotMode: ChildSlotMode): JsxElement {
	if (childSlotMode === 'multiple' && isIterableChild(children)) {
		const slots = Array.from(children)
			.map((child) => normalizeChildSlot(child as JsxChild))
			.filter((child): child is JsxElement => child !== undefined);

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

function normalizeChildSlot(child: JsxChild | undefined): JsxElement | undefined {
	if (child === undefined || child === null || child === false) {
		return undefined;
	}

	if (isIterableChild(child)) {
		const flattenedChildren = flattenChildren(child);
		return flattenedChildren.length === 0 ? undefined : (flattenedChildren as JsxElement);
	}

	return normalizeChildren(child);
}

function flattenChildren(children: JsxChild | undefined): unknown[] {
	if (children === undefined || children === null || children === false) {
		return [];
	}

	if (isIterableChild(children)) {
		const flattened: unknown[] = [];

		for (const child of children) {
			flattened.push(...flattenChildren(child as JsxChild));
		}

		return flattened;
	}

	return [children];
}

function normalizeChildren(children: JsxChild | undefined): JsxElement {
	const flattenedChildren = flattenChildren(children);

	if (flattenedChildren.length === 0) {
		return '';
	}

	if (flattenedChildren.length === 1) {
		return flattenedChildren[0] as JsxElement;
	}

	return flattenedChildren as JsxElement;
}

function normalizeAttributeValue(name: string, value: unknown): unknown {
	if (name === 'class') {
		return normalizeClassList([value]);
	}

	return value;
}

function normalizeClassList(values: Iterable<unknown>): string | undefined {
	const tokens: string[] = [];

	for (const value of values) {
		appendClassTokens(tokens, value);
	}

	if (tokens.length === 0) {
		return undefined;
	}

	return tokens.join(' ');
}

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

function normalizeStyleValue(value: unknown): unknown {
	if (!isPlainObject(value)) {
		return value;
	}

	return Object.entries(value)
		.filter(([, entry]) => entry !== undefined && entry !== null && entry !== '')
		.map(([name, entry]) => `${toKebabCase(name)}: ${String(entry)}`)
		.join('; ');
}

function createTemplateResult(strings: string[], values: unknown[]): TemplateResultLike {
	return {
		[RADIANT_TEMPLATE_RESULT_FIELD]: RADIANT_TEMPLATE_RESULT,
		[LEGACY_TEMPLATE_RESULT_FIELD]: RADIANT_TEMPLATE_RESULT,
		strings: toTemplateStrings(strings),
		values,
	};
}

function wrapKeyedValue(value: JsxElement, key: unknown): JsxElement {
	if (typeof key !== 'string' && typeof key !== 'number') {
		return value;
	}

	return {
		key,
		value,
		[KEYED_VALUE_SYMBOL]: true,
	};
}

function toTemplateStrings(strings: string[]): TemplateStringsArray {
	const templateStrings = [...strings] as unknown as TemplateStringsArray;
	Object.defineProperty(templateStrings, 'raw', {
		value: [...strings],
		writable: false,
	});
	return templateStrings;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIterableChild(value: JsxChild): value is Iterable<JsxChild> {
	return typeof value !== 'string' && typeof value !== 'function' && Symbol.iterator in Object(value);
}

function toKebabCase(value: string): string {
	return value.replace(/[A-Z]/g, (segment) => `-${segment.toLowerCase()}`);
}
