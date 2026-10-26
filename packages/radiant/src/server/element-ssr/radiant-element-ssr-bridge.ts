import '../install/install-ssr-runtime';
import { CUSTOM_ELEMENT_CHILDREN_SYMBOL, Fragment, createMarkupNodeLike, jsx, type JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import { renderServerLightDom, renderToString as renderJsxToString } from '@ecopages/jsx/server';
import {
	createServerHydrationBindingState,
	getActiveSsrScopeValue,
	isServerRenderHydrationActive,
	withActiveSsrScopeValue,
	withServerCustomElementRenderHook,
	withServerHydrationBindingState,
} from '@ecopages/jsx/server';
import { RadiantElementSsrService } from './radiant-element-ssr-service';
import { runWithSsrProviderStack } from '../context-ssr';
import { isRadiantElementSsrHost } from '../../core/radiant-element-ssr-host-source';
import type {
	RadiantElementRenderBridge,
	RadiantElementServerRenderSsrCapable,
	RadiantElementSsrRuntime,
	RadiantElementViewRenderSource,
} from '../../core/radiant-element-ssr-registry';
import { withRadiantElementSsrRuntime } from '../../core/radiant-element-ssr-registry';
import { SERVER_RENDERED_CHILDREN_STAMP, SERVER_RENDERED_HOST_ATTRIBUTE } from '../../core/server-rendered-host';

let radiantElementSsrRuntime: RadiantElementSsrRuntime | undefined;

/**
 * Set while a host's view serializes. In hydrate mode the client hydrates that view again and hands the render-owning
 * hosts in it their Children Value, so with hydrate mode it selects the Children Value path.
 */
const RADIANT_VIEW_SCOPE_KEY = Symbol.for('@ecopages/radiant.ssr-view');

export function createRadiantElementSsrService(component: object): RadiantElementSsrService {
	return new RadiantElementSsrService(component, renderRadiantElementRawViewToString);
}

/** One host-serialization entry used by adapters and nested JSX custom-element SSR. */
export function renderRadiantElementHostToString(
	component: RadiantElementServerRenderSsrCapable,
	options: RenderToStringOptions = {},
): string {
	return withServerRadiantElementSsrRuntime(() => {
		const service = createRadiantElementSsrService(component);
		return service.renderHostToString(options);
	});
}

export function renderRadiantElementHost(component: RadiantElementServerRenderSsrCapable): JsxRenderable {
	return createMarkupNodeLike(renderRadiantElementHostToString(component, { mode: 'hydrate' }));
}

export function renderRegisteredRadiantElementHost(component: unknown): JsxRenderable | undefined {
	if (!isRadiantElementSsrHost(component)) {
		return undefined;
	}

	return renderRadiantElementHost(component);
}

export function renderRegisteredRadiantElementHostToString(
	component: unknown,
	options: RenderToStringOptions = {},
): string | undefined {
	if (!isRadiantElementSsrHost(component)) {
		return undefined;
	}

	return renderRadiantElementHostToString(component, options);
}

export function renderRadiantElementViewToString(
	component: RadiantElementServerRenderSsrCapable,
	options: RenderToStringOptions = {},
): string {
	return withServerRadiantElementSsrRuntime(() =>
		createRadiantElementSsrService(component).renderPreparedViewToString(options),
	);
}

function renderRadiantElementRawViewToString(
	component: RadiantElementViewRenderSource,
	options: RenderToStringOptions,
	beforeSerialize: () => void,
): string {
	return withServerRadiantElementSsrRuntime(() =>
		withRadiantServerCustomElementRenderBridge(() =>
			withActiveSsrScopeValue(RADIANT_VIEW_SCOPE_KEY, true, () => {
				const renderable = component.resolveTrackedRenderOutput().value;
				beforeSerialize();
				return renderJsxToString(renderable, options);
			}),
		),
	);
}

/**
 * Prepares the host and flushes `@bindTo`, then returns its server attributes.
 */
export function getRadiantElementHostSsrAttributes(
	component: RadiantElementServerRenderSsrCapable,
): Record<string, string> {
	return createRadiantElementSsrService(component).getHostAttributes();
}

export function resolveRadiantElementRenderBridge(component: object): RadiantElementRenderBridge | undefined {
	if (!isRadiantElementSsrHost(component)) {
		return undefined;
	}

	return {
		renderHost: () => renderRadiantElementHost(component),
		renderHostToString: (options) => renderRadiantElementHostToString(component, options),
	};
}

/**
 * Installs the JSX custom-element render hook so nested CEs serialize through
 * {@link renderRadiantElementHostToString} (same path as `renderComponent`).
 *
 * @remarks The hook owns JSX children. In hydrate mode, inside a host's view, a render-owning host takes them as a
 * Children Value, as it does when the client renders that view, so its own render places them inside its context
 * providers and serializes them in its marker namespace; it is stamped with {@link SERVER_RENDERED_CHILDREN_STAMP},
 * so on the client it waits for the parent's hydration to hand them back. In plain mode nothing makes the host wait
 * (no stamp) and its parent may never render on the client, so there, as anywhere outside a host's view (such as a
 * page around the hosts), the client sees the children only as Authored Children: the host builds them as light-DOM nodes
 * (`renderServerLightDom`, so no value is escaped and parsed back) inside its own context providers, and captures
 * them for its slots, with the slot-projection payload.
 */
export function withRadiantServerCustomElementRenderBridge<T>(render: () => T): T {
	return withServerCustomElementRenderHook(
		({ children, constructor, instance }) => {
			if (!isRadiantElementSsrHost(instance)) {
				return undefined;
			}

			if (
				children !== undefined &&
				isServerRenderHydrationActive() &&
				getActiveSsrScopeValue(RADIANT_VIEW_SCOPE_KEY) === true &&
				(constructor as { [CUSTOM_ELEMENT_CHILDREN_SYMBOL]?: boolean })[CUSTOM_ELEMENT_CHILDREN_SYMBOL] === true
			) {
				Reflect.set(instance, CUSTOM_ELEMENT_CHILDREN_SYMBOL, jsx(Fragment, { children }));
				return createMarkupNodeLike(
					serializeNestedCustomElementHost(instance, () => undefined, SERVER_RENDERED_CHILDREN_STAMP),
				);
			}

			const applyChildren = () => {
				if (children === undefined) return;
				const ownerDocument = (instance.ownerDocument ?? globalThis.document) as Document;
				instance.replaceChildren(...renderServerLightDom(children, ownerDocument));
			};

			return createMarkupNodeLike(serializeNestedCustomElementHost(instance, applyChildren));
		},
		render,
		{ ownsChildren: true },
	);
}

function serializeNestedCustomElementHost(
	instance: RadiantElementServerRenderSsrCapable,
	applyChildren: () => void,
	stamp?: string,
): string {
	const hydrate = isServerRenderHydrationActive();
	const options: RenderToStringOptions = { hydrate, mode: hydrate ? 'hydrate' : 'plain' };
	const render = () =>
		withServerRadiantElementSsrRuntime(() => {
			const service = createRadiantElementSsrService(instance);
			service.applyLightDom(applyChildren);
			return service.renderHostToString(
				options,
				stamp === undefined ? undefined : { [SERVER_RENDERED_HOST_ATTRIBUTE]: stamp },
			);
		});

	return hydrate ? withServerHydrationBindingState(createServerHydrationBindingState(), render) : render();
}

export function getOrCreateRadiantElementSsrRuntime(): RadiantElementSsrRuntime {
	if (radiantElementSsrRuntime) {
		return radiantElementSsrRuntime;
	}

	radiantElementSsrRuntime = {
		renderHost: renderRadiantElementHost,
		renderHostToString: renderRadiantElementHostToString,
		resolveRenderBridge: resolveRadiantElementRenderBridge,
	};

	return radiantElementSsrRuntime;
}

export function withServerRadiantElementSsrRuntime<T>(render: () => T): T {
	return withRadiantElementSsrRuntime(getOrCreateRadiantElementSsrRuntime(), () => runWithSsrProviderStack(render));
}
