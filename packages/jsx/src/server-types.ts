import type { JsxNodeLike } from './renderable-types.ts';

/**
 * Minimal custom-element contract used by the JSX SSR pipeline.
 */
export interface ServerRenderableCustomElement {
	renderHostToString: (options?: { hydrate?: boolean }) => string;
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
	instance: ServerRenderableCustomElement;
	props: Record<string, unknown>;
	tagName: string;
};

/**
 * Hook invoked when the runtime renders a registered intrinsic custom element.
 */
export type ServerCustomElementRenderHook = (context: ServerCustomElementRenderHookContext) => JsxNodeLike | undefined;
