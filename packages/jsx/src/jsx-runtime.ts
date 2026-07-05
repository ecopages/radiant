import { createJsxElement, createMarkupNodeLike, fragmentSymbol, type JsxFragment } from './jsx-factory.ts';
import { SUBSCRIBABLE_JSX_VALUE_SYMBOL, SLOT_JSX_VALUE_SYMBOL } from './types.ts';
import type {
	JsxComponent,
	JsxCustomIntrinsicElements,
	JsxIntrinsicAttributes,
	JsxRenderable,
	SubscribableJsxValue,
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

/**
 * Creates a subscribable JSX child value.
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

export { createMarkupNodeLike };

/**
 * Marks a string as trusted HTML and hands it to the JSX runtime as opaque markup.
 */
export function unsafeHtml(html: string): import('./types.ts').JsxNodeLike {
	return createMarkupNodeLike(html);
}
