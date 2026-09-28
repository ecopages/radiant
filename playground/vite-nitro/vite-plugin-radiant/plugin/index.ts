import { posix } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { Plugin, ViteDevServer } from 'vite';
import { normalizePath } from 'vite';
import {
	createAppLoadModeModule,
	createClientRegistryModule,
	createComponentsModule,
	createDomRegistryModule,
	createSsrAssetRegistryModule,
	createSsrRegistryModule,
	getResolvedRadiantVirtualModule,
	joinComponentGlob,
	listResolvedRadiantVirtualModules,
	normalizeAppLoadMode,
	normalizeComponentDirectory,
	normalizeInclude,
	RADIANT_DOM_METADATA_QUERY,
	resolveRadiantVirtualModuleId,
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

export function radiantElements(options: RadiantVitePluginOptions = {}): Plugin {
	const componentDirectory = normalizeComponentDirectory(options.componentDirectory ?? defaultComponentDirectory);
	const include = normalizeInclude(options.include ?? defaultInclude);
	const appLoadMode = normalizeAppLoadMode(options.defaultAppLoadMode ?? defaultAppLoadMode);
	const appLoadModeHeader = options.appLoadModeHeader ?? defaultAppLoadModeHeader;
	const clientOnlySearchParam = options.clientOnlySearchParam ?? defaultClientOnlySearchParam;
	const componentGlob = joinComponentGlob(componentDirectory, include);
	const componentStyleGlob = joinComponentGlob(componentDirectory, '**/*.css');
	const virtualModuleLoaders = new Map<string, () => string>([
		[getResolvedRadiantVirtualModule('components'), () => createComponentsModule(componentGlob)],
		[getResolvedRadiantVirtualModule('clientRegistry'), () => createClientRegistryModule(componentGlob)],
		[
			getResolvedRadiantVirtualModule('domRegistry'),
			() => createDomRegistryModule(componentGlob, RADIANT_DOM_METADATA_QUERY),
		],
		[
			getResolvedRadiantVirtualModule('ssrRegistry'),
			() => createSsrRegistryModule(componentGlob, RADIANT_DOM_METADATA_QUERY),
		],
		[getResolvedRadiantVirtualModule('ssrAssetRegistry'), () => createSsrAssetRegistryModule(componentStyleGlob)],
		[
			getResolvedRadiantVirtualModule('appLoadMode'),
			() => createAppLoadModeModule({ appLoadMode, appLoadModeHeader, clientOnlySearchParam }),
		],
	]);
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

		for (const virtualModuleId of listResolvedRadiantVirtualModules()) {
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
			return resolveRadiantVirtualModuleId(source);
		},
		load(id) {
			if (id.endsWith(`?${RADIANT_DOM_METADATA_QUERY}`)) {
				return readFile(id.slice(0, -`?${RADIANT_DOM_METADATA_QUERY}`.length), 'utf8').then((source) => {
					const customElementTagNames = Array.from(
						source.matchAll(/@customElement\s*\(\s*(['"`])([^'"`]+)\1/g),
						(match) => match[2],
					);
					const controllerIdentifiers = Array.from(
						source.matchAll(/@controller\s*\(\s*(['"`])([^'"`]+)\1/g),
						(match) => match[2],
					);

					return `export default ${JSON.stringify({ customElementTagNames, controllerIdentifiers })};\n`;
				});
			}

			return virtualModuleLoaders.get(id)?.();
		},
	};
}
