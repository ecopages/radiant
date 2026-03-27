import type { ServerRenderableComponent, ServerRenderableComponentConstructor } from '@ecopages/radiant/server/render-component';
import { getSsrClientModuleRoutePath } from './ssr-client-modules';

type ModuleExportRecord = Record<string, unknown>;

const componentModules = import.meta.glob('../src/components/**/*.script.tsx');
const ssrClientModuleRouteCache = new WeakMap<Function, string>();

export async function resolvePlaygroundSsrClientModuleSrc<TComponent extends ServerRenderableComponent>(
	component: ServerRenderableComponentConstructor<TComponent>,
): Promise<string | undefined> {
	const cachedRoute = ssrClientModuleRouteCache.get(component);

	if (cachedRoute) {
		return cachedRoute;
	}

	for (const [modulePath, loader] of Object.entries(componentModules)) {
		const moduleExports = (await loader()) as ModuleExportRecord;

		if (!Object.values(moduleExports).includes(component)) {
			continue;
		}

		const routePath = getSsrClientModuleRoutePath(modulePath);
		ssrClientModuleRouteCache.set(component, routePath);
		return routePath;
	}

	return undefined;
}