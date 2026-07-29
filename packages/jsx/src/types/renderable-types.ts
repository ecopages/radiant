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
declare const RADIANT_MARKUP_NODE_SYMBOL_TYPE: unique symbol;
/**
 * Symbol key present on trusted markup nodes created via `createMarkupNodeLike` /
 * `unsafeHtml`. Raw `outerHTML` is only emitted when this brand is present.
 */
export const RADIANT_MARKUP_NODE_SYMBOL: typeof RADIANT_MARKUP_NODE_SYMBOL_TYPE = Symbol.for(
	'@ecopages/jsx.markup-node',
) as typeof RADIANT_MARKUP_NODE_SYMBOL_TYPE;

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
 *
 * Raw `outerHTML` is only treated as trusted markup when the value also carries
 * {@link RADIANT_MARKUP_NODE_SYMBOL} (via `createMarkupNodeLike` / `unsafeHtml`).
 * Unbranded objects with `outerHTML` are serialized and mounted as escaped text.
 */
export interface JsxNodeLike {
	childNodes?: JsxNodeLike[];
	nodeType: JsxNodeType;
	outerHTML?: string;
	textContent?: string | null;
	readonly [RADIANT_MARKUP_NODE_SYMBOL]?: true;
}

/**
 * Radiant template result produced by the JSX runtime.
 */
export interface TemplateResultLike {
	readonly ['_$rType$']: typeof RADIANT_TEMPLATE_RESULT;
	readonly rootLocalName?: string;
	readonly ssrIntrinsicProps?: Readonly<Record<string, unknown>>;
	readonly strings: TemplateStringsArray;
	readonly values: readonly unknown[];
}

/**
 * Template payload shape that can be transported across process or integration
 * boundaries and later rehydrated into a standard template result.
 */
export interface SerializableTemplateResultLike {
	readonly rootLocalName?: string;
	readonly ssrIntrinsicProps?: Readonly<Record<string, unknown>>;
	readonly strings: readonly string[];
	readonly values?: readonly unknown[];
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
 * Plain object or array state that may back a subscribable binding source when it
 * is not directly {@link JsxRenderable}, but can be projected through `map` or
 * member access.
 */
export type JsxBindingObjectValue = Record<string, unknown> | readonly unknown[];

/**
 * Value that may back a subscribable binding source, including non-renderable
 * object state projected through `map` or member access.
 */
export type JsxBindingSourceValue = JsxRenderable | JsxBindingObjectValue;

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
export interface SubscribableJsxValue<Value extends JsxBindingSourceValue = JsxRenderable> {
	readonly [SUBSCRIBABLE_JSX_VALUE_SYMBOL]: true;
	getValue: () => Value;
	subscribe: (notify: (value: Value) => void) => () => void;
	/**
	 * Projects the current value through `project` into a new derived binding.
	 *
	 * The returned binding keeps the same `getValue`/`subscribe`/`SUBSCRIBABLE_JSX_VALUE_SYMBOL`
	 * contract, so it mounts through the existing reactive child/attribute engines with no
	 * special-casing. Because the result is itself a `SubscribableJsxValue`, derivations can be
	 * chained (`.map(a).map(b)`). Create the derived binding once (e.g. a host field) rather than
	 * inside `render()`, because the live-subscription fast path keys on source identity.
	 */
	map<Out extends JsxRenderable>(project: (value: Value) => Out): SubscribableJsxValueWithAccess<Out>;
}

/**
 * Maps a binding value to a subscribable per member key. For object-like values
 * this is the type behind ergonomic member access (`value.key`); the runtime
 * Proxy in `createSubscribableJsxValue` provides the matching behavior.
 */
type SubscribableMemberAccess<Value> = Value extends object
	? {
			readonly [K in keyof Value]: SubscribableJsxValue<Extract<Value[K], JsxRenderable>>;
		}
	: Record<string, never>;

/**
 * `SubscribableJsxValue` enriched with ergonomic per-key member access
 * (`value.key`) for object-like values. Returned by `createSubscribableJsxValue`
 * and `mapSubscribable`; the runtime Proxy provides the matching behavior.
 */
export type SubscribableJsxValueWithAccess<Value extends JsxBindingSourceValue = JsxRenderable> =
	SubscribableJsxValue<Value> & SubscribableMemberAccess<Value>;

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
	| SerializableTemplateResultLike
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
