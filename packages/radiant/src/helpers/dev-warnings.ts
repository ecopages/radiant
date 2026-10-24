const JSX_DEV_WARNINGS_ENABLED_SYMBOL = Symbol.for('@ecopages/jsx.dev-warnings-enabled');

/** Returns whether the shared `@ecopages/jsx` development-warning switch permits warnings. */
export function areJsxDevWarningsEnabled(): boolean {
	const globalScope = globalThis as typeof globalThis & Record<PropertyKey, unknown>;
	return globalScope[JSX_DEV_WARNINGS_ENABLED_SYMBOL] !== false;
}
