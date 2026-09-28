import type { JsxNodeLike } from './renderable-types.ts';
import type { RenderToStringOptions } from '../ssr/server-render.ts';

/**
 * Minimal custom-element contract used by the JSX SSR pipeline.
 *
 * JSX itself only understands one generic SSR-capable custom-element shape:
 * an instance that can produce host HTML through `renderHostToString(...)`.
 * Framework-specific element models, such as `RadiantElement`, are adapted into
 * this contract through the server custom-element render hook rather than by
 * teaching the JSX core about each framework type directly.
 */
export interface ServerRenderableCustomElement {
	renderHostToString: (options?: RenderToStringOptions) => string;
	setAttribute?: (name: string, value: unknown) => void;
	removeAttribute?: (name: string) => void;
	[propertyName: string]: unknown;
}

/**
 * Context passed to server custom-element render hooks.
 */
export type ServerCustomElementRenderHookContext = {
	constructor: CustomElementConstructor;
	hydrate: boolean;
	instance: HTMLElement;
	props: Record<string, unknown>;
	tagName: string;
};

/**
 * Hook invoked when the runtime renders a registered intrinsic custom element.
 *
 * This hook is the seam where framework-owned custom elements can intercept
 * plain registered custom-element instances and replace the default generic SSR
 * behavior with framework-aware host rendering.
 *
 * When returning markup via `outerHTML`, use `createMarkupNodeLike(...)` /
 * `unsafeHtml(...)` so the HTML is branded as trusted. Unbranded
 * `{ nodeType, outerHTML }` objects are escaped as text.
 */
export type ServerCustomElementRenderHook = (context: ServerCustomElementRenderHookContext) => JsxNodeLike | undefined;
