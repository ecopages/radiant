import { posix } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { normalizePath } from 'vite';
import {
	createAppLoadModeModule,
	createClientRegistryModule,
	createComponentsModule,
	createSsrAssetRegistryModule,
	createSsrRegistryModule,
	joinComponentGlob,
	normalizeAppLoadMode,
	normalizeComponentDirectory,
	normalizeInclude,
	type RadiantAppLoadMode,
} from './utils';

/**
 * Configuration options for the `radiantComponents` Vite plugin.
 * All fields are optional; the plugin applies sensible defaults when omitted.
 */
export type RadiantVitePluginOptions = {
	/** Source directory scanned for component entries. Default: `src/components`. */
	componentDirectory?: string;
	/** Glob pattern (relative to `componentDirectory`) used to discover component entries. Default: `**\/*.script.tsx`. */
	include?: string;
	/** Default rendering mode applied when no request header or search param overrides it. Default: `'ssr'`. */
	defaultAppLoadMode?: RadiantAppLoadMode;
	/** Request header name used to override the app load mode per request. Default: `x-radiant-app-load-mode`. */
	appLoadModeHeader?: string;
	/** URL search param that forces client-only rendering when set to a truthy value (`1`, `true`, `yes`, `on`). Default: `client-only`. */
	clientOnlySearchParam?: string;
};

const defaultComponentDirectory = 'src/components';
const defaultInclude = '**/*.script.tsx';
const defaultAppLoadMode = 'ssr';
const defaultAppLoadModeHeader = 'x-radiant-app-load-mode';
const defaultClientOnlySearchParam = 'client-only';
const radiantComponentsId = 'virtual:radiant/components';
const radiantClientRegistryId = 'virtual:radiant/client-module-registry';
const radiantSsrRegistryId = 'virtual:radiant/ssr-client-module-registry';
const radiantSsrAssetRegistryId = 'virtual:radiant/ssr-asset-registry';
const radiantAppLoadModeId = 'virtual:radiant/app-load-mode';
const resolvedRadiantComponentsId = `\0${radiantComponentsId}`;
const resolvedRadiantClientRegistryId = `\0${radiantClientRegistryId}`;
const resolvedRadiantSsrRegistryId = `\0${radiantSsrRegistryId}`;
const resolvedRadiantSsrAssetRegistryId = `\0${radiantSsrAssetRegistryId}`;
const resolvedRadiantAppLoadModeId = `\0${radiantAppLoadModeId}`;

/**
 * Vite plugin that registers Radiant component virtual modules and wires HMR invalidation.
 *
 * Registers five virtual modules:
 * - `virtual:radiant/components` — eager side-effect imports for all component entries.
 * - `virtual:radiant/client-module-registry` — lazy loader map used by the client runtime.
 * - `virtual:radiant/ssr-client-module-registry` — SSR module key resolver for `renderComponent`.
 * - `virtual:radiant/ssr-asset-registry` — Vite-aware asset resolver for SSR fragment responses.
 * - `virtual:radiant/app-load-mode` — request-level SSR / client-only mode negotiation.
 *
 * In the dev server, all virtual modules are invalidated when a component file matching the
 * configured glob is added or removed, keeping the module graph in sync with the file system.
 */
export function radiantComponents(options: RadiantVitePluginOptions = {}): Plugin {
	const componentDirectory = normalizeComponentDirectory(options.componentDirectory ?? defaultComponentDirectory);
	const include = normalizeInclude(options.include ?? defaultInclude);
	const appLoadMode = normalizeAppLoadMode(options.defaultAppLoadMode ?? defaultAppLoadMode);
	const appLoadModeHeader = options.appLoadModeHeader ?? defaultAppLoadModeHeader;
	const clientOnlySearchParam = options.clientOnlySearchParam ?? defaultClientOnlySearchParam;
	const componentGlob = joinComponentGlob(componentDirectory, include);
	const componentStyleGlob = joinComponentGlob(componentDirectory, '**/*.css');
	let rootDirectory = '';
	let devServer: ViteDevServer | undefined;

	function isComponentFile(filePath: string): boolean {
		const normalizedFilePath = normalizePath(filePath);
		const componentRoot = normalizePath(posix.join(rootDirectory, componentDirectory));

		return normalizedFilePath.startsWith(componentRoot) && normalizedFilePath.endsWith('.script.tsx');
	}

	function invalidateVirtualModules(): void {
		if (!devServer) {
			return;
		}

		for (const virtualModuleId of [
			resolvedRadiantComponentsId,
			resolvedRadiantClientRegistryId,
			resolvedRadiantSsrRegistryId,
			resolvedRadiantSsrAssetRegistryId,
			resolvedRadiantAppLoadModeId,
		]) {
			const moduleNode = devServer.moduleGraph.getModuleById(virtualModuleId);

			if (moduleNode) {
				devServer.moduleGraph.invalidateModule(moduleNode);
			}
		}
	}

	return {
		name: 'radiant:components',
		configResolved(config) {
			rootDirectory = normalizePath(config.root);
		},
		configureServer(server) {
			devServer = server;

			const invalidateOnWatch = (filePath: string) => {
				if (isComponentFile(filePath)) {
					invalidateVirtualModules();
				}
			};

			server.watcher.on('add', invalidateOnWatch);
			server.watcher.on('unlink', invalidateOnWatch);

			return () => {
				server.watcher.off('add', invalidateOnWatch);
				server.watcher.off('unlink', invalidateOnWatch);
			};
		},
		handleHotUpdate(context) {
			if (!isComponentFile(context.file)) {
				return;
			}

			invalidateVirtualModules();
		},
		resolveId(source) {
			if (source === radiantComponentsId) {
				return resolvedRadiantComponentsId;
			}

			if (source === radiantClientRegistryId) {
				return resolvedRadiantClientRegistryId;
			}

			if (source === radiantSsrRegistryId) {
				return resolvedRadiantSsrRegistryId;
			}

			if (source === radiantSsrAssetRegistryId) {
				return resolvedRadiantSsrAssetRegistryId;
			}

			if (source === radiantAppLoadModeId) {
				return resolvedRadiantAppLoadModeId;
			}
		},
		load(id) {
			if (id === resolvedRadiantComponentsId) {
				return createComponentsModule(componentGlob);
			}

			if (id === resolvedRadiantClientRegistryId) {
				return createClientRegistryModule(componentGlob);
			}

			if (id === resolvedRadiantSsrRegistryId) {
				return createSsrRegistryModule(componentGlob);
			}

			if (id === resolvedRadiantSsrAssetRegistryId) {
				return createSsrAssetRegistryModule(componentStyleGlob);
			}

			if (id === resolvedRadiantAppLoadModeId) {
				return createAppLoadModeModule({
					appLoadMode,
					appLoadModeHeader,
					clientOnlySearchParam,
				});
			}
		},
	};
}
