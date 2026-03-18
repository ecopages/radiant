const HTML_TEMPLATE_RESULT = 1;

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

/**
 * A primitive child value that Lit can render directly.
 */
export type JsxPrimitive = boolean | bigint | number | null | string | undefined;

/**
 * A Lit-compatible template result produced by the JSX runtime.
 */
export interface TemplateResultLike {
	readonly ['_$litType$']: typeof HTML_TEMPLATE_RESULT;
	readonly strings: TemplateStringsArray;
	readonly values: readonly unknown[];
}

/**
 * A lightweight node-like value that can be serialized on the server.
 */
export interface JsxNodeLike {
	childNodes?: JsxNodeLike[];
	nodeType: number;
	outerHTML?: string;
	textContent?: string | null;
}

/**
 * A value that can be returned from a JSX component.
 */
export type JsxChild = JsxPrimitive | JsxNodeLike | Node | TemplateResultLike | Iterable<JsxChild>;

/**
 * Props received by a JSX component.
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
 * Generates a Lit-compatible template result for a JSX element.
 */
export function jsx<Props extends JsxComponentProps>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
): JsxElement {
	return createJsxElement(type, props);
}

/**
 * Generates a Lit-compatible template result for a JSX element with multiple children.
 */
export function jsxs<Props extends JsxComponentProps>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
): JsxElement {
	return createJsxElement(type, props);
}

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
		key?: never;
	}

	export type IntrinsicElements = JsxDomIntrinsicElements & {
		[elementName: string]: JsxIntrinsicAttributes<globalThis.Element>;
	};
}

function createJsxElement<Props extends JsxComponentProps>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
): JsxElement {
	if (typeof type === 'function') {
		return type(props);
	}

	if (type === fragmentSymbol) {
		return normalizeChildren(props.children);
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
		return createTemplateResult(strings, values);
	}

	strings[strings.length - 1] += '>';
	appendChildren(strings, values, children);
	strings[strings.length - 1] += `</${type}>`;

	return createTemplateResult(strings, values);
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

function appendChildren(strings: string[], values: unknown[], children: JsxChild | undefined): void {
	for (const child of flattenChildren(children)) {
		values.push(child);
		strings.push('');
	}
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
		['_$litType$']: HTML_TEMPLATE_RESULT,
		strings: toTemplateStrings(strings),
		values,
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
