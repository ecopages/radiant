const JSX_GLOBAL_SYMBOL_PREFIX = '@ecopages/jsx';

/**
 * Returns a namespaced global symbol used for cross-module JSX runtime state.
 *
 * Keeping symbol creation behind one utility avoids scattering raw
 * `Symbol.for(...)` keys across the package when renderers need shared process-
 * level coordination.
 *
 * @param suffix Stable suffix appended to the JSX symbol namespace.
 * @returns Global symbol registered under the shared JSX namespace.
 */
export function getJsxGlobalSymbol(suffix: string): symbol {
	return Symbol.for(`${JSX_GLOBAL_SYMBOL_PREFIX}.${suffix}`);
}
