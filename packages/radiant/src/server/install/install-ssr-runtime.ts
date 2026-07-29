/**
 * Canonical Node SSR boot for Radiant: JSX scope adapters, light-DOM shim, HTML parsers.
 *
 * Import this module once per process (side-effect import). Other `@ecopages/radiant/server/*`
 * entrypoints also import it; app SSR bundles should import it first when the bundler may
 * reorder modules. Adapter installation lives in this file (not a side-effect-only sibling)
 * so the server esbuild graph cannot tree-shake it into an empty chunk.
 *
 * @remarks
 * Scope adapters and HTML parser tables are **module-local**; the published server build
 * uses esbuild code splitting (`packages/radiant/build.ts`) so all server entries share one
 * instance. `globalThis` is reserved for light-DOM constructors and other process APIs, not
 * for duplicating registry state across bundles.
 *
 * @packageDocumentation
 */
import { getActiveSsrScopeValue, withActiveSsrScopeValue } from '@ecopages/jsx/server';
import { installRadiantElementSsrScopeAdapters } from '../core/radiant-element-ssr-registry';
import { installLightDomShim } from './light-dom-shim';
import './minimal-dom/html';

installRadiantElementSsrScopeAdapters({
	get: getActiveSsrScopeValue,
	withValue: withActiveSsrScopeValue,
});
installLightDomShim();

/**
 * Non-undefined export so bundlers keep this side-effect module when externalized.
 * Defined locally (do not re-export from install-light-dom-shim) so the radiant
 * package build does not emit a broken renamed re-export after inlining.
 */
export const radiantSsrRuntimeInstalled = true;

/** Kept as exports so the dist build retains HTML parser registration side effects. */
export { parseHtmlToNodes, serializeNodeHtml } from './minimal-dom/html';
