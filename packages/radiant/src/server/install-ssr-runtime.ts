import './install-light-dom-shim';
import './install-ssr-scope-adapters';

/**
 * Non-undefined export so bundlers keep this side-effect module when externalized.
 * Defined locally (do not re-export from install-light-dom-shim) so the radiant
 * package build does not emit a broken renamed re-export after inlining.
 */
export const radiantSsrRuntimeInstalled = true;
