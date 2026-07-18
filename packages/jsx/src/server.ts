export {
	createServerHydrationBindingState,
	withServerHydrationBindingState,
	renderToString,
	isServerRenderHydrationActive,
	withForcedServerCustomElementRendering,
	withServerCustomElementRenderHook,
	type RenderToStringOptions,
	type ServerHydrationBindingState,
} from './server-render.ts';

/** Node-only ALS helpers for framework SSR ambient state. Client code must not import this entry. */
export {
	createLazyNodeAsyncLocalStorage,
	createNodeAsyncLocalStorage,
	type NodeAsyncLocalStorage,
} from './lazy-async-local-storage.ts';

export { getActiveSsrScopeValue, withActiveSsrScopeValue } from './ssr-render-scope.ts';

export {
	type ServerCustomElementRenderHook,
	type ServerCustomElementRenderHookContext,
	type ServerRenderableCustomElement,
} from './types.ts';
