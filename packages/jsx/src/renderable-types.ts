/** Runtime marker stamped on every Radiant template result object. */
export const RADIANT_TEMPLATE_RESULT = 1;
/** Property key written on every Radiant template result object. */
export const RADIANT_TEMPLATE_RESULT_FIELD = '_$rType$';
declare const KEYED_VALUE_SYMBOL_TYPE: unique symbol;
/** Symbol key present on keyed JSX wrapper objects. */
export const KEYED_VALUE_SYMBOL: typeof KEYED_VALUE_SYMBOL_TYPE = Symbol.for(
	'@ecopages/jsx.keyed-value',
) as typeof KEYED_VALUE_SYMBOL_TYPE;
declare const SUBSCRIBABLE_JSX_VALUE_SYMBOL_TYPE: unique symbol;
/** Symbol key present on subscribable JSX wrapper objects. */
export const SUBSCRIBABLE_JSX_VALUE_SYMBOL: typeof SUBSCRIBABLE_JSX_VALUE_SYMBOL_TYPE = Symbol.for(
	'@ecopages/jsx.subscribable-value',
) as typeof SUBSCRIBABLE_JSX_VALUE_SYMBOL_TYPE;
declare const SLOT_JSX_VALUE_SYMBOL_TYPE: unique symbol;
/** Symbol key present on slot placeholder wrapper objects. */
export const SLOT_JSX_VALUE_SYMBOL: typeof SLOT_JSX_VALUE_SYMBOL_TYPE = Symbol.for(
	'@ecopages/jsx.slot-value',
) as typeof SLOT_JSX_VALUE_SYMBOL_TYPE;

/**
 * Core scalar child value that the renderer can mount directly.
 */
export type JsxPrimitive = boolean | bigint | number | null | string | undefined;

/**
 * Subset of DOM `Node.nodeType` values used by the JSX serialization layer.
 */
export type JsxNodeType = 1 | 3 | 11;

/**
 * Lightweight node-like value that can be serialized without a live DOM node.
 */
export interface JsxNodeLike {
	childNodes?: JsxNodeLike[];
	nodeType: JsxNodeType;
	outerHTML?: string;
	textContent?: string | null;
}

/**
 * Radiant template result produced by the JSX runtime.
 */
export interface TemplateResultLike {
	readonly ['_$rType$']: typeof RADIANT_TEMPLATE_RESULT;
	readonly rootLocalName?: string;
	readonly strings: TemplateStringsArray;
	readonly values: readonly unknown[];
}

/**
 * Stable identity used to preserve keyed child ownership.
 */
export type JsxKey = number | string;

/**
 * Internal wrapper for keyed child metadata.
 */
export interface KeyedJsxValue {
	readonly key: JsxKey;
	readonly value: JsxRenderable;
	readonly [KEYED_VALUE_SYMBOL]: true;
}

/**
 * Generic read/subscribe contract consumable as a JSX child binding.
 */
export interface SignalLike<Value extends JsxRenderable = JsxRenderable> {
	get: () => Value;
	subscribe: (notify: (value: Value) => void) => () => void;
}

/**
 * JSX child value backed by an external subscription source.
 */
export interface SubscribableJsxValue<Value extends JsxRenderable = JsxRenderable> {
	readonly [SUBSCRIBABLE_JSX_VALUE_SYMBOL]: true;
	getValue: () => Value;
	subscribe: (notify: (value: Value) => void) => () => void;
}

/**
 * Internal placeholder emitted from literal `<slot>` JSX tags.
 */
export interface SlotJsxValue {
	readonly [SLOT_JSX_VALUE_SYMBOL]: true;
	readonly fallback?: JsxRenderable;
	readonly name?: string;
}

/**
 * Value that can be rendered by the JSX runtime.
 */
export type JsxRenderable =
	| JsxPrimitive
	| JsxNodeLike
	| KeyedJsxValue
	| Node
	| SignalLike
	| SlotJsxValue
	| SubscribableJsxValue
	| TemplateResultLike
	| Iterable<JsxRenderable>;

/**
 * Minimal props contract shared by JSX components that accept children.
 */
export interface JsxPropsWithChildren {
	children?: JsxRenderable;
}

/**
 * Function component supported by the Radiant JSX runtime.
 */
export type JsxComponent<Props extends object = JsxPropsWithChildren> = (props: Props) => JsxRenderable;
