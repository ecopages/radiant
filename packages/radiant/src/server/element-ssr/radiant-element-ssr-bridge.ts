import '../install/install-ssr-runtime';
import { createMarkupNodeLike, type JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import { renderServerLightDom, renderToString as renderJsxToString } from '@ecopages/jsx/server';
import {
	createServerHydrationBindingState,
	isServerRenderHydrationActive,
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

let radiantElementSsrRuntime: RadiantElementSsrRuntime | undefined;

export function createRadiantElementSsrService(component: object): RadiantElementSsrService {
	return new RadiantElementSsrService(component, renderRadiantElementViewToString);
}

/** One host-serialization entry used by adapters and nested JSX custom-element SSR. */
export function renderRadiantElementHostToString(
	component: RadiantElementServerRenderSsrCapable,
	options: RenderToStringOptions = {},
): string {
	return withServerRadiantElementSsrRuntime(() => {
		const service = createRadiantElementSsrService(component);
		return service.renderHostToString(options, service.getHostAttributes());
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
	component: RadiantElementViewRenderSource,
	options: RenderToStringOptions = {},
): string {
	return withServerRadiantElementSsrRuntime(() =>
		withRadiantServerCustomElementRenderBridge(() =>
			renderJsxToString(component.resolveTrackedRenderOutput().value, options),
		),
	);
}

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
 * @remarks The hook owns JSX children: a host builds them as light-DOM nodes (`renderServerLightDom`, so no
 * value is escaped and parsed back) inside its own context providers, where a consumer passed as a child of a
 * provider host resolves that provider.
 */
export function withRadiantServerCustomElementRenderBridge<T>(render: () => T): T {
	return withServerCustomElementRenderHook(
		({ children, instance }) => {
			if (!isRadiantElementSsrHost(instance)) {
				return undefined;
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
): string {
	const hydrate = isServerRenderHydrationActive();
	const options: RenderToStringOptions = { hydrate, mode: hydrate ? 'hydrate' : 'plain' };
	const render = () =>
		withServerRadiantElementSsrRuntime(() => {
			const service = createRadiantElementSsrService(instance);
			service.applyLightDom(applyChildren);
			return service.renderHostToString(options, service.getHostAttributes());
		});

	return hydrate ? withServerHydrationBindingState(createServerHydrationBindingState(), render) : render();
}

export function getOrCreateRadiantElementSsrRuntime(): RadiantElementSsrRuntime {
	if (radiantElementSsrRuntime) {
		return radiantElementSsrRuntime;
	}

	radiantElementSsrRuntime = {
		getHostAttributes: getRadiantElementHostSsrAttributes,
		renderHost: renderRadiantElementHost,
		renderHostToString: renderRadiantElementHostToString,
		resolveRenderBridge: resolveRadiantElementRenderBridge,
		renderView: renderRadiantElementViewToString,
	};

	return radiantElementSsrRuntime;
}

export function withServerRadiantElementSsrRuntime<T>(render: () => T): T {
	return withRadiantElementSsrRuntime(getOrCreateRadiantElementSsrRuntime(), () => runWithSsrProviderStack(render));
}
