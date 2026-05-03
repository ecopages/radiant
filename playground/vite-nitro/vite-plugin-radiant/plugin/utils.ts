export { createClientRegistryModule, createDomRegistryModule } from './client';
export { createComponentsModule, createSsrAssetRegistryModule, createSsrRegistryModule } from './server';
export {
	createAppLoadModeModule,
	joinComponentGlob,
	getResolvedRadiantVirtualModule,
	listResolvedRadiantVirtualModules,
	normalizeAppLoadMode,
	normalizeComponentDirectory,
	normalizeInclude,
	RADIANT_DOM_METADATA_QUERY,
	RADIANT_VIRTUAL_MODULES,
	type RadiantAppLoadMode,
	type RadiantVirtualModuleId,
	type RadiantVirtualModuleName,
	resolveRadiantVirtualModuleId,
} from './shared';
