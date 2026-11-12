const JSX_DEV_WARNINGS_ENABLED_SYMBOL = Symbol.for('@ecopages/jsx.dev-warnings-enabled');

/** Returns whether the shared `@ecopages/jsx` development-warning switch permits warnings. */
export function areJsxDevWarningsEnabled(): boolean {
	const globalScope = globalThis as typeof globalThis & Record<PropertyKey, unknown>;
	return globalScope[JSX_DEV_WARNINGS_ENABLED_SYMBOL] !== false;
}

let warnedKeys: Set<string> | undefined;

/**
 * Logs a development warning once per `key`.
 *
 * @remarks
 * `message` returns `undefined` to skip the warning without consuming the key. The check wraps the warning
 * instead of returning early, because some bundlers (Rollup) keep the code after an early `return` inside a
 * `try`; the `try` keeps an unbundled browser load, where `process` does not exist, from throwing. A
 * `"production"` build drops the whole block.
 */
export function warnOnceInDevelopment(key: string, message: () => string | undefined): void {
	try {
		if (process.env.NODE_ENV !== 'production' && areJsxDevWarningsEnabled()) {
			const warned = (warnedKeys ??= new Set<string>());
			if (warned.has(key)) return;
			const text = message();
			if (text === undefined) return;
			warned.add(key);
			console.warn(text);
		}
	} catch {}
}
