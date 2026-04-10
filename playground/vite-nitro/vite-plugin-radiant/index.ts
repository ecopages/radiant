import { posix } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { normalizePath } from 'vite';
import {
	createAppLoadModeModule,
	createClientRegistryModule,
	createSsrRegistryModule,
	joinComponentGlob,
	normalizeAppLoadMode,
	normalizeComponentDirectory,
	normalizeInclude,
	type RadiantAppLoadMode,
} from './utils';

export type RadiantVitePluginOptions = {
	componentDirectory?: string;
	include?: string;
	defaultAppLoadMode?: RadiantAppLoadMode;
	appLoadModeHeader?: string;
	clientOnlySearchParam?: string;
};

const defaultComponentDirectory = 'src/components';
const defaultInclude = '**/*.script.tsx';
const defaultAppLoadMode = 'ssr';
const defaultAppLoadModeHeader = 'x-radiant-app-load-mode';
const defaultClientOnlySearchParam = 'client-only';
const radiantClientRegistryId = 'virtual:radiant/client-module-registry';
const radiantSsrRegistryId = 'virtual:radiant/ssr-client-module-registry';
const radiantAppLoadModeId = 'virtual:radiant/app-load-mode';
const resolvedRadiantClientRegistryId = `\0${radiantClientRegistryId}`;
const resolvedRadiantSsrRegistryId = `\0${radiantSsrRegistryId}`;
const resolvedRadiantAppLoadModeId = `\0${radiantAppLoadModeId}`;

export function radiantComponents(options: RadiantVitePluginOptions = {}): Plugin {
	const componentDirectory = normalizeComponentDirectory(options.componentDirectory ?? defaultComponentDirectory);
	const include = normalizeInclude(options.include ?? defaultInclude);
	const appLoadMode = normalizeAppLoadMode(options.defaultAppLoadMode ?? defaultAppLoadMode);
	const appLoadModeHeader = options.appLoadModeHeader ?? defaultAppLoadModeHeader;
	const clientOnlySearchParam = options.clientOnlySearchParam ?? defaultClientOnlySearchParam;
	const componentGlob = joinComponentGlob(componentDirectory, include);
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
			resolvedRadiantClientRegistryId,
			resolvedRadiantSsrRegistryId,
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
			if (source === radiantClientRegistryId) {
				return resolvedRadiantClientRegistryId;
			}

			if (source === radiantSsrRegistryId) {
				return resolvedRadiantSsrRegistryId;
			}

			if (source === radiantAppLoadModeId) {
				return resolvedRadiantAppLoadModeId;
			}
		},
		load(id) {
			if (id === resolvedRadiantClientRegistryId) {
				return createClientRegistryModule(componentGlob);
			}

			if (id === resolvedRadiantSsrRegistryId) {
				return createSsrRegistryModule(componentGlob);
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
