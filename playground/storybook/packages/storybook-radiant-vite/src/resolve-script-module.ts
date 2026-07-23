import type { ViteDevServer } from 'vite';
import { RADIANT_SCRIPT_EXPORT, RADIANT_SCRIPT_MODULE, RADIANT_VIEW_ELEMENT } from './symbols';
import { normalizeSsrModulePath, scriptModuleCandidatesFromViewModule, toViteSsrModulePath } from './ssr-module-path';

type RadiantElementConstructor = CustomElementConstructor & {
	[RADIANT_SCRIPT_MODULE]?: string;
	[RADIANT_SCRIPT_EXPORT]?: string;
};

type RadiantViewComponent = ((args: unknown) => unknown) & {
	[RADIANT_VIEW_ELEMENT]?: RadiantElementConstructor;
};

async function resolveScriptModuleId(server: ViteDevServer, modulePath: string): Promise<string | null> {
	const normalized = normalizeSsrModulePath(modulePath);

	try {
		const resolved = await server.pluginContainer.resolveId(normalized, undefined, { ssr: true });
		if (!resolved) {
			return null;
		}

		const id = typeof resolved === 'string' ? resolved : resolved.id;
		return toViteSsrModulePath(id, server.config.root);
	} catch {
		return null;
	}
}

async function tryLoadScriptModule(
	server: ViteDevServer,
	modulePath: string,
	tried: Set<string>,
): Promise<string | null> {
	const resolved = await resolveScriptModuleId(server, modulePath);
	if (!resolved || tried.has(resolved)) {
		return null;
	}
	tried.add(resolved);

	try {
		await server.ssrLoadModule(resolved);
		return resolved;
	} catch {
		return null;
	}
}

async function readStampedScriptModuleFromView(
	server: ViteDevServer,
	viewModule: string,
	viewExport: string | undefined,
): Promise<{ ssrModule?: string; ssrExport?: string }> {
	const viewMod = (await server.ssrLoadModule(normalizeSsrModulePath(viewModule))) as Record<string, unknown>;
	const view = (viewExport ? viewMod[viewExport] : viewMod.default) as RadiantViewComponent | undefined;

	if (typeof view !== 'function') {
		return {};
	}

	const linked = view[RADIANT_VIEW_ELEMENT];
	if (!linked) {
		return {};
	}

	return {
		ssrModule: linked[RADIANT_SCRIPT_MODULE],
		ssrExport: linked[RADIANT_SCRIPT_EXPORT],
	};
}

/**
 * Resolve the Radiant `.script` module on the Vite server.
 * Prefers stamped metadata from the loaded view, then explicit hints, then co-located candidates.
 */
export async function resolveScriptSsrModule(
	server: ViteDevServer,
	options: {
		ssrModule?: string;
		ssrExport?: string;
		viewModule?: string;
		viewExport?: string;
	},
): Promise<{ ssrModule: string; ssrExport?: string }> {
	const tried = new Set<string>();

	if (options.viewModule) {
		try {
			const stamped = await readStampedScriptModuleFromView(server, options.viewModule, options.viewExport);
			if (stamped.ssrModule) {
				const loaded = await tryLoadScriptModule(server, stamped.ssrModule, tried);
				if (loaded) {
					return {
						ssrModule: loaded,
						ssrExport: options.ssrExport ?? stamped.ssrExport,
					};
				}
			}
		} catch {
			// Fall through to hinted/candidate resolution.
		}
	}

	if (options.ssrModule) {
		const loaded = await tryLoadScriptModule(server, options.ssrModule, tried);
		if (loaded) {
			return { ssrModule: loaded, ssrExport: options.ssrExport };
		}
	}

	if (options.viewModule) {
		for (const candidate of scriptModuleCandidatesFromViewModule(options.viewModule)) {
			const loaded = await tryLoadScriptModule(server, candidate, tried);
			if (loaded) {
				return { ssrModule: loaded, ssrExport: options.ssrExport };
			}
		}
	}

	throw new Error(
		`Could not resolve Radiant script module${
			options.viewModule ? ` for view ${options.viewModule}` : ''
		}. Tried: ${[...tried].join(', ')}`,
	);
}
