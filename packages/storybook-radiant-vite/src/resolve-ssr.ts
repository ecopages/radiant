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
}): {
	ssrModule?: string;
	ssrExport?: string;
	viewModule?: string;
	viewExport?: string;
	storyModule?: string;
	storyExport?: string;
} | null {
	const { component, radiant, storyModule, storyExport } = options;

	if (radiant?.ssrModule) {
		return {
			ssrModule: normalizeSsrModulePath(radiant.ssrModule),
			ssrExport: radiant.ssrExport,
			viewModule: radiant.viewModule ? normalizeSsrModulePath(radiant.viewModule) : undefined,
			viewExport: radiant.viewExport,
			storyModule: radiant.storyModule ? normalizeSsrModulePath(radiant.storyModule) : storyModule,
			storyExport: radiant.storyExport ?? storyExport,
		};
	}

	if (typeof component === 'function') {
		const view = component as RadiantViewComponent;
		const linkedElement = view[RADIANT_VIEW_ELEMENT];
		const viewModule = getRadiantViewModule(view);
		const viewModulePath = viewModule ? normalizeSsrModulePath(viewModule) : undefined;
		const scriptModule =
			getRadiantScriptModule(view) ?? (linkedElement ? getRadiantScriptModule(linkedElement) : undefined);
		const scriptExport =
			radiant?.ssrExport ??
			(linkedElement ? getRadiantScriptExport(linkedElement) : undefined) ??
			getRadiantScriptExport(view) ??
			linkedElement?.name;
		const viewExport = radiant?.viewExport ?? scriptExport;

		if (scriptModule || viewModulePath) {
			return {
				ssrModule: scriptModule
					? normalizeSsrModulePath(scriptModule)
					: viewModulePath
						? preferredScriptModuleFromViewModule(viewModulePath)
						: undefined,
				ssrExport: scriptExport,
				viewModule: viewModulePath,
				viewExport,
				storyModule,
				storyExport,
			};
		}
	}

	const element = resolveRadiantElement(component);
	if (!element) {
		return null;
	}

	const ssrModule = getRadiantScriptModule(element);
	if (!ssrModule) {
		return null;
	}

	return {
		ssrModule: normalizeSsrModulePath(ssrModule),
		ssrExport: radiant?.ssrExport ?? getRadiantScriptExport(element) ?? element.name,
		storyModule,
		storyExport,
	};
}

export function getRadiantTagName(component: RadiantComponent | undefined): string | undefined {
	const element = resolveRadiantElement(component);
	if (element) {
		return getCustomElementTagName(element);
	}
	return typeof component === 'string' ? component : undefined;
}
