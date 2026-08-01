import { createJsxElement, createMarkupNodeLike, fragmentSymbol, type JsxFragment } from './factory/jsx-factory.ts';
import { isSubscribableJsxValue } from './types/renderable-guards.ts';
import { SLOT_JSX_VALUE_SYMBOL, SUBSCRIBABLE_JSX_VALUE_SYMBOL } from './types/index.ts';
import type {
	JsxBindingSourceValue,
	JsxComponent,
	JsxCustomIntrinsicElements,
	JsxIntrinsicAttributes,
	JsxRenderable,
	SignalLike,
	SubscribableJsxValue,
	SubscribableJsxValueWithAccess,
	SlotJsxValue,
} from './types/index.ts';

export {
	isKeyedJsxValue,
	isSerializableTemplateResultLike,
	isSubscribableJsxValue,
	isTemplateResultLike,
	resolveBindingShapeValue,
	toTemplateResultLike,
} from './types/renderable-guards.ts';
export { renderJsxRenderableToString } from './ssr/serialize-plain.ts';
export { forEachNormalizedAttribute } from './factory/attribute-normalize.ts';
export {
	shouldUseAttributeBindingByDefaultForElement,
	shouldUseBooleanAttributeBinding,
} from './factory/binding-defaults.ts';
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
	JsxHtmlPropsWithChildren,
	JsxIntrinsicAttributes,
	JsxKey,
	JsxNodeLike,
	JsxNodeType,
	JsxBindingObjectValue,
	JsxBindingSourceValue,
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
} from './types/index.ts';

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
		key?: import('./types/index.ts').JsxKey;
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

type MapSource<Value extends JsxBindingSourceValue> =
	SubscribableJsxValue<Value> | (Value extends JsxRenderable ? SignalLike<Value> : never);

type MappableSubscribable<Value extends JsxBindingSourceValue> = SubscribableJsxValue<Value>;

function createDerivedSubscribable<Value extends JsxBindingSourceValue, Out extends JsxBindingSourceValue>(
	source: MapSource<Value>,
	project: (value: Value) => Out,
): MappableSubscribable<Out> {
	if (isSubscribableJsxValue(source)) {
		const subscribable = source as SubscribableJsxValue<Value>;

		return {
			[SUBSCRIBABLE_JSX_VALUE_SYMBOL]: true,
			getValue: () => project(subscribable.getValue()),
			subscribe: (notify) => subscribable.subscribe((value) => notify(project(value))),
			map: <Out2 extends JsxBindingSourceValue>(project2: (value: Out) => Out2) =>
				mapSubscribable(subscribable, (value: Value) => project2(project(value))),
		};
	}

	const signal = source as SignalLike<Extract<Value, JsxRenderable>>;

	// Duck-type only — importing `@ecopages/signals` here would duplicate its runtime
	// when docs vendor-prebundles both jsx-runtime and radiant.
	return {
		[SUBSCRIBABLE_JSX_VALUE_SYMBOL]: true,
		getValue: () => project(signal.get()),
		subscribe: (notify) => signal.subscribe((value) => notify(project(value))),
		map: <Out2 extends JsxBindingSourceValue>(project2: (value: Out) => Out2) =>
			mapSubscribable(source, (value) => project2(project(value as Value))),
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
export function mapSubscribable<Value extends JsxBindingSourceValue, Out extends JsxBindingSourceValue>(
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
function makeMemberAccessProxy<Value extends JsxBindingSourceValue>(
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
export function createSubscribableJsxValue<Value extends JsxBindingSourceValue>(config: {
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
export function unsafeHtml(html: string): import('./types/index.ts').JsxNodeLike {
	return createMarkupNodeLike(html);
}
