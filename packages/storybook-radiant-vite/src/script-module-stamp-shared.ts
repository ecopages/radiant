import { toViteSsrModulePath } from './ssr-module-path';

const SCRIPT_MODULE = '@ecopages/storybook-radiant.scriptModule';
const SCRIPT_EXPORT = '@ecopages/storybook-radiant.scriptExport';
const VIEW_MODULE = '@ecopages/storybook-radiant.viewModule';
const STORY_MODULE = '@ecopages/storybook-radiant.storyModule';

function findRadiantElementExports(code: string): string[] {
	const exported = [...code.matchAll(/export\s+class\s+(\w+)/g)].map((match) => match[1]);
	const lowered = [...code.matchAll(/^(\w+)\s*=\s*__decorateElement\(/gm)].map((match) => match[1]);
	const reexported = [...code.matchAll(/export\s*\{\s*\w+\s+as\s+(\w+)\s*\}/g)].map((match) => match[1]);
	return [...new Set([...exported, ...lowered, ...reexported])];
}

function findRadiantViewExports(code: string): string[] {
	return [
		...new Set([...code.matchAll(/export\s+const\s+(\w+)\s*=\s*defineRadiantView\(/g)].map((match) => match[1])),
	];
}

function hasStableScriptModuleStamp(code: string): boolean {
	return code.includes(`Symbol.for('${SCRIPT_MODULE}')] = '/src/`);
}

function hasStableViewModuleStamp(code: string): boolean {
	return code.includes(`Symbol.for('${VIEW_MODULE}')] = '/src/`);
}

function hasStableStoryModuleStamp(code: string): boolean {
	return code.includes(`storyModule: '/src/`) || code.includes(`Symbol.for('${STORY_MODULE}')] = '/src/`);
}

/**
 * Append SSR module metadata to RadiantElement constructor exports.
 */
export function appendRadiantScriptModuleStamps(code: string, moduleId: string, root: string): string | null {
	if (hasStableScriptModuleStamp(code)) {
		return null;
	}

	const exports = findRadiantElementExports(code);
	if (!exports.length) {
		return null;
	}

	const modulePath = toViteSsrModulePath(moduleId, root);
	const withoutLegacyStamp = code
		.replace(new RegExp(`^\\w+\\[Symbol\\.for\\('${SCRIPT_MODULE}'\\)\\] = [^;]+;\\s*$`, 'gm'), '')
		.replace(new RegExp(`^\\w+\\[Symbol\\.for\\('${SCRIPT_EXPORT}'\\)\\] = '[^']+';\\s*$`, 'gm'), '');

	const stamps = exports
		.map(
			(name) =>
				`${name}[Symbol.for('${SCRIPT_MODULE}')] = '${modulePath}';\n` +
				`${name}[Symbol.for('${SCRIPT_EXPORT}')] = '${name}';`,
		)
		.join('\n');

	return `${withoutLegacyStamp.trimEnd()}\n${stamps}\n`;
}

/** Collect relative `*.css` paths from `stylesheets: [...]` / `attachRadiantStylesheets(..., [...])`. */
export function collectDeclaredStylesheetImports(code: string): string[] {
	const paths = [
		...code.matchAll(/stylesheets:\s*\[([^\]]*)\]/g),
		...code.matchAll(/attachRadiantStylesheets\s*\(\s*[^,]+,\s*\[([^\]]*)\]/g),
	].flatMap((match) =>
		[...match[1]!.matchAll(/['"]((?:\.\.?\/)+[^'"]+\.css)['"]/g)].map((pathMatch) => pathMatch[1]!),
	);

	return [...new Set(paths)];
}

/**
 * Prepend side-effect CSS imports declared on the view (Storybook-only).
 *
 * @remarks
 * Published radiant-ui builds keep stylesheets as path metadata so Ecopages
 * vendor prebundles stay CSS-free. Storybook reintroduces the original
 * `import './x.css'` loading behavior here when the view module is transformed.
 */
export function injectDeclaredStylesheetImports(code: string): string {
	const missing = collectDeclaredStylesheetImports(code).filter(
		(stylesheet) => !code.includes(`import '${stylesheet}'`) && !code.includes(`import "${stylesheet}"`),
	);

	if (!missing.length) {
		return code;
	}

	return `${missing.map((stylesheet) => `import '${stylesheet}';`).join('\n')}\n${code}`;
}

/**
 * Append view module metadata to `defineRadiantView` exports and inject declared CSS imports.
 */
export function appendRadiantViewModuleStamps(code: string, moduleId: string, root: string): string | null {
	const withImports = injectDeclaredStylesheetImports(code);
	const exports = findRadiantViewExports(withImports);
	const needsStamp = exports.length > 0 && !hasStableViewModuleStamp(withImports);

	if (withImports === code && !needsStamp) {
		return null;
	}

	if (!needsStamp) {
		return withImports === code ? null : withImports;
	}

	const modulePath = toViteSsrModulePath(moduleId, root);
	const stamps = exports.map((name) => `${name}[Symbol.for('${VIEW_MODULE}')] = '${modulePath}';`).join('\n');

	return `${withImports.trimEnd()}\n${stamps}\n`;
}

/**
 * Stamp CSF story files with their module path for server-side args resolution.
 */
export function appendRadiantStoryModuleStamp(code: string, moduleId: string, root: string): string | null {
	if (hasStableStoryModuleStamp(code)) {
		return null;
	}

	if (!/export\s+default\s+meta\b/.test(code)) {
		return null;
	}

	const modulePath = toViteSsrModulePath(moduleId, root);
	return `${code.trimEnd()}
if (!meta.parameters) meta.parameters = {};
meta.parameters.radiant = { ...(meta.parameters.radiant ?? {}), storyModule: '${modulePath}' };
`;
}
