import {
	getRadiantElementSsrRuntime,
	registerRadiantElementSsrRuntime,
	type RadiantElementSsrRuntime,
} from '../core/radiant-component-ssr-registry';
import {
	getRadiantElementHostSsrAttributes,
	renderRadiantElementHost,
	renderRadiantElementHostToString,
	renderRadiantElementViewToString,
	resolveRadiantElementRenderBridge,
} from './radiant-component-ssr-bridge';

/**
 * Registers the shared Radiant SSR runtime if it is not already present.
 *
 * Server entrypoints call this eagerly so instance SSR methods, nested JSX
 * custom-element SSR, and portable server helpers all share one implementation
 * and one bridge-resolution strategy.
 */
export function ensureRadiantElementSsrRuntimeRegistered() {
	const existingRuntime = getRadiantElementSsrRuntime();

	if (existingRuntime) {
		return existingRuntime;
	}

	const runtime: RadiantElementSsrRuntime = {
		getHostAttributes: getRadiantElementHostSsrAttributes,
		renderHost: renderRadiantElementHost,
		renderHostToString: renderRadiantElementHostToString,
		resolveRenderBridge: resolveRadiantElementRenderBridge,
		renderView: renderRadiantElementViewToString,
	};

	registerRadiantElementSsrRuntime(runtime);
	return runtime;
}

ensureRadiantElementSsrRuntimeRegistered();
