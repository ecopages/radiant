import { readFile } from 'node:fs/promises';
import type { Plugin, ViteDevServer } from 'vite';
import { normalizePath } from 'vite';
import { createClientRegistryModule, createDomRegistryModule } from './client';
import { createComponentsModule, createSsrAssetRegistryModule, createSsrRegistryModule } from './server';
import {
	extractRadiantDomModuleMetadata,
	serializeRadiantDomModuleMetadata,
} from './extract-dom-metadata';
import {
	createAppLoadModeModule,
	createComponentFileMatcher,
	createComponentStyleFileMatcher,
	joinComponentGlobs,
	joinStyleGlobs,
	getResolvedRadiantVirtualModule,
	listResolvedRadiantVirtualModules,
	normalizeAppLoadMode,
	normalizeComponentDirectory,
	normalizeInclude,
	RADIANT_DOM_METADATA_QUERY,
	resolveRadiantVirtualModuleId,
	type RadiantAppLoadMode,
} from './shared';

export type RadiantElementsPluginOptions = {
	componentDirectory?: string;
	include?: string | string[];
	styles?: string | string[];
	defaultAppLoadMode?: RadiantAppLoadMode;
	appLoadModeHeader?: string;
	clientOnlySearchParam?: string;
};

const defaultComponentDirectory = 'src/components';
const defaultInclude = ['**/*.script.ts', '**/*.script.tsx'];
const defaultStyles = '**/*.css';
const defaultAppLoadMode = 'ssr';
const defaultAppLoadModeHeader = 'x-radiant-app-load-mode';
const defaultClientOnlySearchParam = 'client-only';

export function radiantElements(options: RadiantElementsPluginOptions = {}): Plugin {
	const componentDirectory = normalizeComponentDirectory(options.componentDirectory ?? defaultComponentDirectory);
	const includes = normalizeInclude(options.include ?? defaultInclude);
	const styles = options.styles ?? defaultStyles;
	const appLoadMode = normalizeAppLoadMode(options.defaultAppLoadMode ?? defaultAppLoadMode);
	const appLoadModeHeader = options.appLoadModeHeader ?? defaultAppLoadModeHeader;
	const clientOnlySearchParam = options.clientOnlySearchParam ?? defaultClientOnlySearchParam;
	const componentGlob = joinComponentGlobs(componentDirectory, includes);
	const componentStyleGlob = joinStyleGlobs(componentDirectory, styles);
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
	const domMetadataCache = new Map<string, string>();
	let rootDirectory = '';
	let devServer: ViteDevServer | undefined;
	let isComponentFile: (filePath: string) => boolean = () => false;
	let isComponentStyleFile: (filePath: string) => boolean = () => false;

	function invalidateVirtualModules(only?: 'ssrAssetRegistry'): void {
		if (!devServer) {
			return;
		}

		const targetIds =
			only === 'ssrAssetRegistry'
				? [getResolvedRadiantVirtualModule('ssrAssetRegistry')]
				: listResolvedRadiantVirtualModules();

		for (const virtualModuleId of targetIds) {
			const moduleNode = devServer.moduleGraph.getModuleById(virtualModuleId);

			if (moduleNode) {
				devServer.moduleGraph.invalidateModule(moduleNode);
			}
		}
	}

	function triggerFullReload(server: ViteDevServer): void {
		invalidateVirtualModules();

		server.ws.send({
			type: 'full-reload',
		});
	}

	return {
		name: 'radiant:components',
		configResolved(config) {
			rootDirectory = normalizePath(config.root);
			isComponentFile = createComponentFileMatcher(rootDirectory, componentDirectory, includes);
			isComponentStyleFile = createComponentStyleFileMatcher(rootDirectory, componentDirectory, styles);
		},
		configureServer(server) {
			devServer = server;

			const onRegistryFilesystemChange = (filePath: string) => {
				const normalizedPath = normalizePath(filePath);

				if (!isComponentFile(normalizedPath) && !isComponentStyleFile(normalizedPath)) {
					return;
				}

				domMetadataCache.delete(normalizedPath);
				triggerFullReload(server);
			};

			server.watcher.on('add', onRegistryFilesystemChange);
			server.watcher.on('unlink', onRegistryFilesystemChange);

			return () => {
				server.watcher.off('add', onRegistryFilesystemChange);
				server.watcher.off('unlink', onRegistryFilesystemChange);
			};
		},
		async handleHotUpdate(context) {
			const normalizedPath = normalizePath(context.file);

			if (isComponentStyleFile(normalizedPath)) {
				invalidateVirtualModules('ssrAssetRegistry');
				return;
			}

			if (!isComponentFile(normalizedPath)) {
				return;
			}

			const previousMetadata = domMetadataCache.get(normalizedPath);
			const source = await context.read();
			const nextMetadata = serializeRadiantDomModuleMetadata(extractRadiantDomModuleMetadata(source));
			domMetadataCache.set(normalizedPath, nextMetadata);

			if (previousMetadata !== undefined && previousMetadata !== nextMetadata) {
				triggerFullReload(context.server);
				return [];
			}

			invalidateVirtualModules();
		},
		resolveId(source) {
			return resolveRadiantVirtualModuleId(source);
		},
		load(id) {
			if (id.endsWith(`?${RADIANT_DOM_METADATA_QUERY}`)) {
				const sourcePath = normalizePath(id.slice(0, -`?${RADIANT_DOM_METADATA_QUERY}`.length));

				return readFile(sourcePath, 'utf8').then((source) => {
					const metadata = extractRadiantDomModuleMetadata(source);
					domMetadataCache.set(sourcePath, serializeRadiantDomModuleMetadata(metadata));

					return `export default ${JSON.stringify(metadata)};\n`;
				});
			}

			return virtualModuleLoaders.get(id)?.();
		},
	};
}

export type { RadiantAppLoadMode } from './shared';
