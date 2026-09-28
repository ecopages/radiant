import { startControllers, type ControllerRegistryRuntime } from '@/utils/radiant-browser-runtime';

const docsControllerRuntimeKey = Symbol.for('@ecopages/radiant.docs.controller-runtime');

export function ensureDocsControllersStarted(): ControllerRegistryRuntime | undefined {
	if (typeof document === 'undefined') {
		return undefined;
	}

	const registryHost = globalThis as typeof globalThis & {
		[docsControllerRuntimeKey]?: ControllerRegistryRuntime;
	};

	registryHost[docsControllerRuntimeKey] ??= startControllers(document);

	return registryHost[docsControllerRuntimeKey];
}
