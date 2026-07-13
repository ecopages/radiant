import type { JsxRenderable, SignalLike, SubscribableJsxValue } from './renderable-types.ts';

type Booleanish = boolean | 'true' | 'false';
type StringKeyOf<Value> = Extract<keyof Value, string>;
type JsxBindablePropertyName<ElementType extends object> = {
	[PropertyName in StringKeyOf<ElementType>]: ElementType[PropertyName] extends (...args: any[]) => any
		? never
		: PropertyName;
}[StringKeyOf<ElementType>];
type StructuredAttributePrimitive = string | number | boolean | null | undefined;
type ReactiveAttributeValue<Value extends StructuredAttributePrimitive> =
	| Value
	| SignalLike<Extract<Value, boolean>>
	| SignalLike<Extract<Value, number>>
	| SignalLike<Extract<Value, string>>
	| SignalLike<Extract<Value, null>>
	| SignalLike<Extract<Value, undefined>>
	| SubscribableJsxValue<Extract<Value, boolean>>
	| SubscribableJsxValue<Extract<Value, number>>
	| SubscribableJsxValue<Extract<Value, string>>
	| SubscribableJsxValue<Extract<Value, null>>
	| SubscribableJsxValue<Extract<Value, undefined>>;

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
 * Accepted value for `on:*` and `on-native:*` bindings.
 */
export type JsxEventListener<EventType extends Event = Event, CurrentTarget extends EventTarget = EventTarget> =
	JsxEventHandler<EventType, CurrentTarget> | JsxEventListenerObject<EventType>;

type JsxEventBindings<ElementType extends EventTarget> = {
	[EventName in keyof GlobalEventHandlersEventMap as `on:${EventName}`]?: JsxEventListener<
		GlobalEventHandlersEventMap[EventName],
		ElementType
	>;
} & {
	[EventName in keyof GlobalEventHandlersEventMap as `on-native:${EventName}`]?: JsxEventListener<
		GlobalEventHandlersEventMap[EventName],
		ElementType
	>;
} & {
	[eventName: `on:${string}`]: JsxEventListener<Event, ElementType> | undefined;
	[eventName: `on-native:${string}`]: JsxEventListener<Event, ElementType> | undefined;
};

type JsxPropertyBindings<ElementType extends object> = {
	[PropertyName in JsxBindablePropertyName<ElementType> as `prop:${PropertyName}`]?: ElementType[PropertyName];
};

type JsxAttributeBindings = {
	[AttributeName in `attr:${string}`]?: ReactiveAttributeValue<StructuredAttributePrimitive>;
};

/*
 * All the WAI-ARIA 1.1 attributes from https://www.w3.org/TR/wai-aria-1.1/
 */
interface AriaAttributesNormalizedBase {
	activedescendant?: string | undefined;
	atomic?: Booleanish | undefined;
	autocomplete?: 'none' | 'inline' | 'list' | 'both' | undefined;
	braillelabel?: string | undefined;
	brailleroledescription?: string | undefined;
	busy?: Booleanish | undefined;
	checked?: boolean | 'false' | 'mixed' | 'true' | undefined;
	colcount?: number | undefined;
	colindex?: number | undefined;
	colindextext?: string | undefined;
	colspan?: number | undefined;
	controls?: string | undefined;
	current?: boolean | 'false' | 'true' | 'page' | 'step' | 'location' | 'date' | 'time' | undefined;
	describedby?: string | undefined;
	description?: string | undefined;
	details?: string | undefined;
	disabled?: Booleanish | undefined;
	dropeffect?: 'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup' | undefined;
	errormessage?: string | undefined;
	expanded?: Booleanish | undefined;
	flowto?: string | undefined;
	grabbed?: Booleanish | undefined;
	haspopup?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' | undefined;
	hidden?: Booleanish | undefined;
	invalid?: boolean | 'false' | 'true' | 'grammar' | 'spelling' | undefined;
	keyshortcuts?: string | undefined;
	label?: string | undefined;
	labelledby?: string | undefined;
	level?: number | undefined;
	live?: 'off' | 'assertive' | 'polite' | undefined;
	modal?: Booleanish | undefined;
	multiline?: Booleanish | undefined;
	multiselectable?: Booleanish | undefined;
	orientation?: 'horizontal' | 'vertical' | undefined;
	owns?: string | undefined;
	placeholder?: string | undefined;
	posinset?: number | undefined;
	pressed?: boolean | 'false' | 'mixed' | 'true' | undefined;
	readonly?: Booleanish | undefined;
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
	required?: Booleanish | undefined;
	roledescription?: string | undefined;
	rowcount?: number | undefined;
	rowindex?: number | undefined;
	rowindextext?: string | undefined;
	rowspan?: number | undefined;
	selected?: Booleanish | undefined;
	setsize?: number | undefined;
	sort?: 'none' | 'ascending' | 'descending' | 'other' | undefined;
	valuemax?: number | undefined;
	valuemin?: number | undefined;
	valuenow?: number | undefined;
	valuetext?: string | undefined;
}

export type AriaAttributesNormalized = {
	[PropertyName in keyof AriaAttributesNormalizedBase]: ReactiveAttributeValue<
		Extract<AriaAttributesNormalizedBase[PropertyName], StructuredAttributePrimitive>
	>;
};

/**
 * Accepted value for the `classes` JSX prop.
 */
export type ClassList = string | number | bigint | boolean | null | undefined | Record<string, unknown> | ClassList[];

/** Accepted value for individual entries inside a `style` object. */
export type StylePropertyValue = string | number | null | undefined;

/**
 * Accepted value for the `style` JSX prop.
 */
export type StyleValue = string | Record<string, StylePropertyValue>;

/** Accepted value for individual entries inside a `data` object. */
type DataAttributePrimitive = string | number | boolean | null | undefined;

export type DataAttributeValue =
	| DataAttributePrimitive
	| SignalLike<string>
	| SignalLike<number>
	| SignalLike<boolean>
	| SignalLike<null>
	| SignalLike<undefined>
	| SubscribableJsxValue<string>
	| SubscribableJsxValue<number>
	| SubscribableJsxValue<boolean>
	| SubscribableJsxValue<null>
	| SubscribableJsxValue<undefined>;

/**
 * Standard HTML-level props available to any JSX element.
 */
export interface JsxHtmlProps {
	children?: JsxRenderable;
	class?: string;
	classes?: ClassList;
	style?: StyleValue;
	aria?: Partial<AriaAttributesNormalized> | undefined;
	data?: Record<string, DataAttributeValue>;
}

/**
 * Shared attribute shape for intrinsic elements.
 */
export interface JsxSharedIntrinsicAttributes {
	aria?: Partial<AriaAttributesNormalized> | undefined;
	children?: JsxRenderable;
	class?: string;
	classes?: ClassList;
	data?: Record<string, DataAttributeValue>;
	dir?: string;
	hidden?: boolean;
	id?: string;
	lang?: string;
	part?: string;
	role?: string;
	slot?: string;
	style?: StyleValue;
	tabindex?: number | string;
	title?: string;
}

/**
 * Shared attribute shape for intrinsic elements.
 */
export type JsxIntrinsicAttributes<ElementType extends Element = Element> = JsxSharedIntrinsicAttributes &
	JsxEventBindings<ElementType> &
	JsxAttributeBindings &
	JsxPropertyBindings<ElementType>;

/**
 * All base props accepted by any JSX element.
 */
export type JsxElementProps<ElementType extends Element = HTMLElement> = JsxIntrinsicAttributes<ElementType>;

/**
 * JSX attribute shape for a custom element declaration in `JSX.IntrinsicElements`.
 *
 * `Props` describes the public, unprefixed JSX surface for the custom element,
 * while `ElementType` supplies strongly typed `prop:*` bindings for real instance
 * properties. Runtime custom-element binding remains permissive: unprefixed names
 * still default to property bindings unless they are in the small attribute
 * allowlist or expand from `data` / `aria`. Required versus optional public
 * props are taken directly from `Props`; wrap `Props` in `Partial<...>` at the
 * call site if you want an entirely optional public prop surface.
 */
export type JsxCustomElementAttributes<
	ElementType extends Element = HTMLElement,
	Props extends object = {},
> = JsxIntrinsicAttributes<ElementType> & Props;

/**
 * Module-augmentable registry of custom JSX intrinsic elements for the Ecopages JSX runtime.
 */
export interface JsxCustomIntrinsicElements {}
