/**
 * Convert a Vite module id to the `/src/...` path accepted by `server.ssrLoadModule`.
 */
export function toViteSsrModulePath(moduleId: string, root: string): string {
	const file = (moduleId.split('?')[0] ?? moduleId).replace(/\\/g, '/');
	const normalizedRoot = root.replace(/\\/g, '/').replace(/\/$/, '');

	if (file.startsWith(normalizedRoot)) {
		const relative = file.slice(normalizedRoot.length);
		return relative.startsWith('/') ? relative : `/${relative}`;
	}

	const srcIndex = file.indexOf('/src/');
	if (srcIndex >= 0) {
		return file.slice(srcIndex);
	}

	return file;
}

/**
 * Browser bundles may still carry `import.meta.url` (http://localhost:.../src/...).
 * Normalize to the Vite SSR module path before calling `ssrLoadModule`.
 */
export function normalizeSsrModulePath(ssrModule: string): string {
	if (ssrModule.startsWith('http://') || ssrModule.startsWith('https://')) {
		try {
			return new URL(ssrModule).pathname;
		} catch {
			return ssrModule;
		}
	}

	return ssrModule;
}

/**
 * Co-located Radiant script module candidates for a view module.
 * Order mirrors the repo: `.script.tsx` is most common, then `.script.ts`.
 */
export function scriptModuleCandidatesFromViewModule(viewModule: string): string[] {
	const file = (viewModule.split('?')[0] ?? viewModule).replace(/\\/g, '/');

	if (/\.script\.(?:tsx?|jsx?)$/.test(file)) {
		return [file];
	}

	const base = file.replace(/\.(tsx?|jsx?)$/, '');
	if (!base || base === file) {
		return [file];
	}

	return [`${base}.script.tsx`, `${base}.script.ts`, `${base}.script.jsx`, `${base}.script.js`];
}

/** Best-effort client hint before the server resolves the real script module path. */
export function preferredScriptModuleFromViewModule(viewModule: string): string {
	return scriptModuleCandidatesFromViewModule(viewModule)[0] ?? viewModule;
}

/** @deprecated Use {@link scriptModuleCandidatesFromViewModule} or server-side {@link resolveScriptSsrModule}. */
export function inferScriptModuleFromViewModule(viewModule: string): string {
	return preferredScriptModuleFromViewModule(viewModule);
}
