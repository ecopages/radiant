import { getCustomElementTagName, isCustomElementConstructor } from './host';
import { preferredScriptModuleFromViewModule, normalizeSsrModulePath } from './ssr-module-path';
import { RADIANT_SCRIPT_EXPORT, RADIANT_SCRIPT_MODULE, RADIANT_VIEW_ELEMENT, RADIANT_VIEW_MODULE } from './symbols';
import type { RadiantComponent, RadiantStoryParameters } from './types';

type RadiantElementConstructor = CustomElementConstructor & {
	[RADIANT_SCRIPT_MODULE]?: string;
	[RADIANT_SCRIPT_EXPORT]?: string;
};

export type RadiantViewComponent<TArgs = unknown> = ((args: TArgs) => unknown) & {
	[RADIANT_VIEW_ELEMENT]?: CustomElementConstructor;
	[RADIANT_SCRIPT_MODULE]?: string;
	[RADIANT_SCRIPT_EXPORT]?: string;
	[RADIANT_VIEW_MODULE]?: string;
};

type SsrTarget = {
	kind: 'host' | 'jsx';
	ssrModule?: string;
	ssrExport?: string;
	viewModule?: string;
	viewExport?: string;
	storyModule?: string;
	storyExport?: string;
};

export function getRadiantViewModule(target: CustomElementConstructor | RadiantViewComponent): string | undefined {
	return (target as RadiantViewComponent)[RADIANT_VIEW_MODULE];
}

export function getRadiantScriptModule(target: CustomElementConstructor | RadiantViewComponent): string | undefined {
	return (target as RadiantElementConstructor)[RADIANT_SCRIPT_MODULE];
}

export function getRadiantScriptExport(target: CustomElementConstructor | RadiantViewComponent): string | undefined {
	return (target as RadiantElementConstructor)[RADIANT_SCRIPT_EXPORT];
}

export function linkRadiantViewElement(view: RadiantViewComponent, element: CustomElementConstructor): void {
	view[RADIANT_VIEW_ELEMENT] = element;

	const viewModule = getRadiantViewModule(view);
	const ssrModule = getRadiantScriptModule(element);
	if (ssrModule) {
		view[RADIANT_SCRIPT_MODULE] = ssrModule;
		view[RADIANT_SCRIPT_EXPORT] = getRadiantScriptExport(element) ?? element.name;
	}
	if (viewModule) {
		view[RADIANT_VIEW_MODULE] = viewModule;
	}
}

/**
 * Link `parameters.radiant.element` onto the JSX view and refresh its module stamps.
 *
 * @remarks
 * Call before {@link resolveSsrTarget} so HMR-replaced element classes re-stamp the view.
 * Falls back to an already-linked element for views wired via `defineRadiantComponent`.
 * Non-constructor `element` values (e.g. a JSX view function) are ignored — omit the
 * field for presentational stories.
 */
export function syncViewMetadata(component: unknown, element?: unknown): void {
	if (typeof component !== 'function') {
		return;
	}
	const view = component as RadiantViewComponent;
	const fromParameters = isCustomElementConstructor(element) ? element : undefined;
	const linked = fromParameters ?? view[RADIANT_VIEW_ELEMENT];
	if (linked) {
		linkRadiantViewElement(view, linked);
	}
}

export function resolveRadiantElement(component: RadiantComponent | undefined): CustomElementConstructor | undefined {
	if (!component) {
		return undefined;
	}

	if (isCustomElementConstructor(component)) {
		return component;
	}

	if (typeof component === 'function') {
		const linked = (component as RadiantViewComponent)[RADIANT_VIEW_ELEMENT];
		if (linked) {
			return linked;
		}
	}

	if (typeof component === 'string' && typeof customElements !== 'undefined') {
		const registered = customElements.get(component);
		if (registered && isCustomElementConstructor(registered)) {
			return registered;
		}
	}

	return undefined;
}

/**
 * Resolve SSR module paths from `meta.component` and optional `parameters.radiant` overrides.
 */
export function resolveSsrTarget(options: {
	component: RadiantComponent | undefined;
	radiant?: RadiantStoryParameters['radiant'];
	storyModule?: string;
	storyExport?: string;
}): SsrTarget | null {
	return resolveExplicitSsrTarget(options) ?? resolveViewSsrTarget(options) ?? resolveElementSsrTarget(options);
}

function resolveExplicitSsrTarget(options: {
	radiant?: RadiantStoryParameters['radiant'];
	storyModule?: string;
	storyExport?: string;
}): SsrTarget | undefined {
	const { radiant, storyModule, storyExport } = options;
	if (!radiant?.ssrModule) return undefined;
	return {
		kind: 'host',
		ssrModule: normalizeSsrModulePath(radiant.ssrModule),
		ssrExport: radiant.ssrExport,
		viewModule: radiant.viewModule ? normalizeSsrModulePath(radiant.viewModule) : undefined,
		viewExport: radiant.viewExport,
		storyModule: radiant.storyModule ? normalizeSsrModulePath(radiant.storyModule) : storyModule,
		storyExport: radiant.storyExport ?? storyExport,
	};
}

function resolveViewSsrTarget(options: {
	component: RadiantComponent | undefined;
	radiant?: RadiantStoryParameters['radiant'];
	storyModule?: string;
	storyExport?: string;
}): SsrTarget | undefined {
	if (typeof options.component !== 'function') return undefined;
	const view = options.component as RadiantViewComponent;
	const linkedElement = view[RADIANT_VIEW_ELEMENT];
	const modules = resolveViewModules(view, linkedElement);
	const { scriptModule, viewModulePath } = modules;
	if (!scriptModule && !viewModulePath) return undefined;
	if (options.storyModule) return { kind: 'jsx', storyModule: options.storyModule, storyExport: options.storyExport };
	const scriptExport = resolveViewExport(view, linkedElement, options.radiant);
	return {
		kind: 'host',
		ssrModule: scriptModule
			? normalizeSsrModulePath(scriptModule)
			: preferredScriptModuleFromViewModule(viewModulePath!),
		ssrExport: scriptExport,
		viewModule: viewModulePath,
		viewExport: options.radiant?.viewExport ?? scriptExport,
		storyModule: options.storyModule,
		storyExport: options.storyExport,
	};
}

function resolveViewModules(
	view: RadiantViewComponent,
	linkedElement: CustomElementConstructor | undefined,
): {
	scriptModule: string | undefined;
	viewModulePath: string | undefined;
} {
	const viewModule = getRadiantViewModule(view);
	return {
		scriptModule:
			getRadiantScriptModule(view) ?? (linkedElement ? getRadiantScriptModule(linkedElement) : undefined),
		viewModulePath: viewModule ? normalizeSsrModulePath(viewModule) : undefined,
	};
}

function resolveViewExport(
	view: RadiantViewComponent,
	linkedElement: CustomElementConstructor | undefined,
	radiant: RadiantStoryParameters['radiant'],
): string | undefined {
	return (
		radiant?.ssrExport ??
		(linkedElement ? getRadiantScriptExport(linkedElement) : undefined) ??
		getRadiantScriptExport(view) ??
		linkedElement?.name
	);
}

function resolveElementSsrTarget(options: {
	component: RadiantComponent | undefined;
	radiant?: RadiantStoryParameters['radiant'];
	storyModule?: string;
	storyExport?: string;
}): SsrTarget | null {
	const element = resolveRadiantElement(options.component);
	if (!element)
		return typeof options.component === 'function' && options.storyModule
			? { kind: 'jsx', storyModule: options.storyModule, storyExport: options.storyExport }
			: null;
	const ssrModule = getRadiantScriptModule(element);
	if (!ssrModule) return null;
	return {
		kind: 'host',
		ssrModule: normalizeSsrModulePath(ssrModule),
		ssrExport: options.radiant?.ssrExport ?? getRadiantScriptExport(element) ?? element.name,
		storyModule: options.storyModule,
		storyExport: options.storyExport,
	};
}

export function getRadiantTagName(component: RadiantComponent | undefined): string | undefined {
	const element = resolveRadiantElement(component);
	if (element) {
		return getCustomElementTagName(element);
	}
	return typeof component === 'string' ? component : undefined;
}
