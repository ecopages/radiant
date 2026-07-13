import { computed } from '@ecopages/signals';
import { createJsxElement, createMarkupNodeLike, fragmentSymbol, type JsxFragment } from './jsx-factory.ts';
import { isSubscribableJsxValue } from './renderable-guards.ts';
import { SLOT_JSX_VALUE_SYMBOL, SUBSCRIBABLE_JSX_VALUE_SYMBOL } from './types.ts';
import type {
	JsxComponent,
	JsxCustomIntrinsicElements,
	JsxIntrinsicAttributes,
	JsxRenderable,
	SignalLike,
	SubscribableJsxValue,
	SubscribableJsxValueWithAccess,
	SlotJsxValue,
} from './types.ts';

export {
	isKeyedJsxValue,
	isSerializableTemplateResultLike,
	isSubscribableJsxValue,
	isTemplateResultLike,
	resolveBindingShapeValue,
	toTemplateResultLike,
} from './renderable-guards.ts';
export { renderJsxRenderableToString } from './serialize-plain.ts';
export { forEachNormalizedAttribute } from './attribute-normalize.ts';
export { shouldUseAttributeBindingByDefaultForElement, shouldUseBooleanAttributeBinding } from './binding-defaults.ts';
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
	SerializableTemplateResultLike,
	SignalLike,
	ServerCustomElementRenderHookContext,
	ServerRenderableCustomElement,
	SlotJsxValue,
	StylePropertyValue,
	StyleValue,
	SubscribableJsxValue,
	SubscribableJsxValueWithAccess,
	TemplateResultLike,
} from './types.ts';

type JsxDomIntrinsicAttributes<ElementType extends Element> = JsxIntrinsicAttributes<ElementType> & {
	[key: string]: unknown;
};

type JsxDomIntrinsicElements = {
	[ElementName in keyof HTMLElementTagNameMap]: JsxDomIntrinsicAttributes<HTMLElementTagNameMap[ElementName]>;
} & {
	[ElementName in keyof SVGElementTagNameMap]: JsxDomIntrinsicAttributes<SVGElementTagNameMap[ElementName]>;
};

/** Internal fragment marker type used by the automatic JSX runtime. */
export type { JsxFragment };

/** Fragment marker used by the automatic JSX runtime. */
export const Fragment: JsxFragment = fragmentSymbol;

/**
 * Creates a JSX element where the `children` slot is treated as a single
 * logical value.
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
 */
export function jsxs<Props extends object>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
): JsxRenderable {
	return createJsxElement(type, props, 'multiple');
}

/**
 * Development JSX entrypoint used by toolchains that emit `jsxDEV(...)` calls.
 */
export function jsxDEV<Props extends object>(
	type: string | JsxFragment | JsxComponent<Props>,
	props: Props,
): JsxRenderable {
	return jsx(type, props);
}

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
		key?: import('./types.ts').JsxKey;
	}

	export type IntrinsicElements = JsxDomIntrinsicElements &
		JsxCustomIntrinsicElements & {
			[elementName: string]: JsxIntrinsicAttributes<globalThis.Element>;
		};
}

/** Returns whether a value carries internal slot placeholder metadata. */
export function isSlotJsxValue(value: unknown): value is SlotJsxValue {
	return typeof value === 'object' && value !== null && SLOT_JSX_VALUE_SYMBOL in value;
}

type MapSource<Value extends JsxRenderable> = SubscribableJsxValue<Value> | SignalLike<Value>;

type MappableSubscribable<Value extends JsxRenderable> = SubscribableJsxValue<Value>;

function createDerivedSubscribable<Value extends JsxRenderable, Out extends JsxRenderable>(
	source: MapSource<Value>,
	project: (value: Value) => Out,
): MappableSubscribable<Out> {
	if (isSubscribableJsxValue(source)) {
		return {
			[SUBSCRIBABLE_JSX_VALUE_SYMBOL]: true,
			getValue: () => project(source.getValue()),
			subscribe: (notify) => source.subscribe((value) => notify(project(value))),
			map: <Out2 extends JsxRenderable>(project2: (value: Out) => Out2) =>
				mapSubscribable(source, (value) => project2(project(value))),
		};
	}

	const derived = computed(() => project(source.get()));

	return {
		[SUBSCRIBABLE_JSX_VALUE_SYMBOL]: true,
		getValue: () => derived.get(),
		subscribe: (notify) => derived.subscribe(notify),
		map: <Out2 extends JsxRenderable>(project2: (value: Out) => Out2) =>
			mapSubscribable(source, (value) => project2(project(value))),
	};
}

/**
 * Derives a new {@link SubscribableJsxValue} by projecting `source` through `project`.
 *
 * The returned binding reuses the source's `getValue`/`subscribe` contract, so live updates
 * flow from the source and SSR/hydration transparency is inherited for free. It is the
 * standalone twin of {@link SubscribableJsxValue.map} and additionally accepts a `SignalLike`.
 *
 * Create the derived binding once (e.g. a host field) rather than inside `render()`, because the
 * live-subscription fast path keys on source identity.
 *
 * @param source The reactive source to derive from (`SubscribableJsxValue` or `SignalLike`).
 * @param project Projects the current source value into the derived value.
 * @returns A derived {@link SubscribableJsxValue} with the same mount semantics as any other.
 */
export function mapSubscribable<Value extends JsxRenderable, Out extends JsxRenderable>(
	source: MapSource<Value>,
	project: (value: Value) => Out,
): SubscribableJsxValueWithAccess<Out> {
	return makeMemberAccessProxy(createDerivedSubscribable(source, project));
}

/**
 * Get-trap that forwards the core contract (`getValue`/`subscribe`/`map`) and turns unknown
 * string keys on object-like values into derived bindings (`value.key` ===
 * `value.map(v => v[key])`), memoized per key.
 *
 * Bracket keys and method calls are intentionally not covered — use `map` for those.
 */
function makeMemberAccessProxy<Value extends JsxRenderable>(
	base: MappableSubscribable<Value>,
): SubscribableJsxValueWithAccess<Value> {
	const memberCache = new Map<string, SubscribableJsxValueWithAccess<JsxRenderable>>();
	const handler: ProxyHandler<MappableSubscribable<Value>> = {
		get(target, key, receiver) {
			if (typeof key === 'symbol') {
				return Reflect.get(target, key, receiver);
			}
			if (Reflect.has(target, key)) {
				return Reflect.get(target, key, receiver);
			}
			let derived = memberCache.get(key);
			if (!derived) {
				derived = target.map((value) => (value as unknown as Record<string, unknown>)[key] as JsxRenderable);
				memberCache.set(key, derived);
			}
			return derived;
		},
	};
	return new Proxy(base, handler) as SubscribableJsxValueWithAccess<Value>;
}

/**
 * Creates a subscribable JSX child value.
 *
 * The returned value is wrapped in a Proxy so object-like bindings expose ergonomic
 * member access (`this.$.config.label`). Each member access delegates to `map`.
 */
export function createSubscribableJsxValue<Value extends JsxRenderable>(config: {
	getValue: () => Value;
	subscribe: (notify: (value: Value) => void) => () => void;
}): SubscribableJsxValueWithAccess<Value> {
	const subscribable: MappableSubscribable<Value> = {
		[SUBSCRIBABLE_JSX_VALUE_SYMBOL]: true,
		getValue: config.getValue,
		subscribe: config.subscribe,
		map: (project) => mapSubscribable(subscribable, project),
	};
	return makeMemberAccessProxy(subscribable);
}

export { createMarkupNodeLike };

/**
 * Marks a string as trusted HTML and hands it to the JSX runtime as opaque markup.
 */
export function unsafeHtml(html: string): import('./types.ts').JsxNodeLike {
	return createMarkupNodeLike(html);
}
