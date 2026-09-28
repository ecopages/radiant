/**
 * @deprecated Import `@ecopages/radiant/server/radiant-element-ssr` instead.
 * Kept for compatibility with tooling that still resolves this entry path.
 */
export {
	createRadiantElementSsrService,
	getOrCreateRadiantElementSsrRuntime,
	getRadiantElementHostSsrAttributes,
	renderRadiantElementHost,
	renderRadiantElementHostToString,
	renderRadiantElementViewToString,
	renderRegisteredRadiantElementHost,
	renderRegisteredRadiantElementHostToString,
	resolveRadiantElementRenderBridge,
	withRadiantServerCustomElementRenderBridge,
	withServerRadiantElementSsrRuntime,
} from './element-ssr/radiant-element-ssr-bridge';
