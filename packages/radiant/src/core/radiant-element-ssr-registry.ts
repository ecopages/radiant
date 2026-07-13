import type { JsxRenderable } from '@ecopages/jsx';
import { getActiveSsrScopeValue, type RenderToStringOptions, withActiveSsrScopeValue } from '@ecopages/jsx/server';
import type { InternalRadiantSsrHost } from './radiant-element-ssr-host';

export type RadiantElementRenderBridge = {
	renderHost?: () => JsxRenderable;
	renderHostToString?: (options?: RenderToStringOptions) => string;
};

export type RadiantElementServerRenderSsrCapable = Omit<InternalRadiantSsrHost, 'constructor'> & {
	constructor: Function;
};

export type RadiantElementTrackedRenderSsrCapable = RadiantElementServerRenderSsrCapable;

export type RadiantElementSsrRuntime = {
	getHostAttributes(component: InternalRadiantSsrHost): Record<string, string>;
	renderHost(component: InternalRadiantSsrHost): JsxRenderable;
	renderHostToString(component: InternalRadiantSsrHost, options?: RenderToStringOptions): string;
	resolveRenderBridge(component: object): RadiantElementRenderBridge | undefined;
	renderView(component: InternalRadiantSsrHost, options?: RenderToStringOptions): string;
};

const RADIANT_ELEMENT_SSR_RUNTIME_SYMBOL = Symbol.for('@ecopages/radiant.element-ssr-runtime');

export function getRadiantElementSsrRuntime(): RadiantElementSsrRuntime | undefined {
	return getActiveSsrScopeValue<RadiantElementSsrRuntime>(RADIANT_ELEMENT_SSR_RUNTIME_SYMBOL);
}

export function withRadiantElementSsrRuntime<T>(runtime: RadiantElementSsrRuntime, render: () => T): T {
	return withActiveSsrScopeValue(RADIANT_ELEMENT_SSR_RUNTIME_SYMBOL, runtime, render);
}
