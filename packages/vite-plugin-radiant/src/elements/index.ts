import { readFile } from 'node:fs/promises';
import type { Plugin, ViteDevServer } from 'vite';
import { normalizePath } from 'vite';
import { createClientRegistryModule, createDomRegistryModule } from './client';
import { createComponentsModule, createSsrAssetRegistryModule, createSsrRegistryModule } from './server';
import {
	createAppLoadModeModule,
	createComponentFileMatcher,
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
	let rootDirectory = '';
	let devServer: ViteDevServer | undefined;
	let isComponentFile: (filePath: string) => boolean = () => false;

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
			isComponentFile = createComponentFileMatcher(rootDirectory, componentDirectory, includes);
		},
		configureServer(server) {
			devServer = server;

			const invalidateOnWatch = (filePath: string) => {
				if (isComponentFile(normalizePath(filePath))) {
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
			if (!isComponentFile(normalizePath(context.file))) {
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

export type { RadiantAppLoadMode } from './shared';
