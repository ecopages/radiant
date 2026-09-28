import path from 'node:path';
import { toViteSsrModulePath } from './ssr-module-path';

const SCRIPT_MODULE = '@ecopages/storybook-radiant.scriptModule';
const SCRIPT_EXPORT = '@ecopages/storybook-radiant.scriptExport';
const VIEW_MODULE = '@ecopages/storybook-radiant.viewModule';

function findRadiantElementExports(code: string): string[] {
	const exported = [...code.matchAll(/export\s+class\s+(\w+)/g)].map((match) => match[1]);
	const lowered = [...code.matchAll(/^(\w+)\s*=\s*__decorateElement\(/gm)].map((match) => match[1]);
	const reexported = [...code.matchAll(/export\s*\{\s*\w+\s+as\s+(\w+)\s*\}/g)].map((match) => match[1]);
	return [...new Set([...exported, ...lowered, ...reexported])];
}

function hasStableScriptModuleStamp(code: string): boolean {
	return code.includes(`Symbol.for('${SCRIPT_MODULE}')]`);
}

function hasStableStoryModuleStamp(code: string): boolean {
	return /storyModule:\s*'[^']+'/.test(code);
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

/**
 * Collect relative `*.css` paths from `cssImports: [...]` literals in `parameters.radiant`.
 *
 * @remarks
 * `cssImports` is the only CSS channel that becomes a build-time side-effect import. Skins and
 * other story-scoped extras are loaded at render time by a decorator (see `withStylesheets` in
 * radiant-ui) and are deliberately not scanned here.
 */
export function collectDeclaredCssImports(code: string): string[] {
	const paths = [...code.matchAll(/cssImports:\s*\[([^\]]*)\]/g)].flatMap((match) =>
		[...match[1]!.matchAll(/['"]((?:\.\.?\/)+[^'"]+\.css)['"]/g)].map((pathMatch) => pathMatch[1]!),
	);

	return [...new Set(paths)];
}

/**
 * Prepend side-effect CSS imports declared on CSF Meta (Storybook-only).
 */
export function injectDeclaredCssImports(code: string): string {
	const missing = collectDeclaredCssImports(code).filter(
		(stylesheet) => !code.includes(`import '${stylesheet}'`) && !code.includes(`import "${stylesheet}"`),
	);

	if (!missing.length) {
		return code;
	}

	return `${missing.map((stylesheet) => `import '${stylesheet}';`).join('\n')}\n${code}`;
}

function findMetaComponentExport(code: string): string | null {
	const metaLiteral =
		code.match(/const\s+meta\s*=\s*\{[\s\S]*?\}\s*satisfies\s+Meta\b/) ??
		code.match(/const\s+meta\s*=\s*\{[\s\S]*?\};/);
	if (!metaLiteral) {
		return null;
	}

	return metaLiteral[0].match(/\bcomponent:\s*(\w+)/)?.[1] ?? null;
}

function resolveImportedViewModule(
	code: string,
	storyModuleId: string,
	root: string,
	componentName: string,
): string | null {
	const importMatch = code.match(
		new RegExp(`import\\s+\\{[^}]*\\b${componentName}\\b[^}]*\\}\\s+from\\s+['"]([^'"]+)['"]`),
	);
	if (!importMatch?.[1]) {
		return null;
	}

	const storyFile = (storyModuleId.split('?')[0] ?? storyModuleId).replace(/\\/g, '/');
	const resolvedBase = path.resolve(path.dirname(storyFile), importMatch[1]).replace(/\\/g, '/');
	const withExt = /\.(?:tsx?|jsx?)$/.test(resolvedBase) ? resolvedBase : `${resolvedBase}.tsx`;
	return toViteSsrModulePath(withExt, root);
}

function hasViewModuleStampForExport(code: string, exportName: string): boolean {
	return code.includes(`${exportName}[Symbol.for('${VIEW_MODULE}')]`);
}

/**
 * Stamp `meta.component` with a view module path for SSR.
 */
export function appendMetaViewStamps(code: string, moduleId: string, root: string): string | null {
	const component = findMetaComponentExport(code);
	if (!component || hasViewModuleStampForExport(code, component)) {
		return null;
	}

	const viewModule = resolveImportedViewModule(code, moduleId, root, component);
	if (!viewModule) {
		return null;
	}

	return `${code.trimEnd()}\n${component}[Symbol.for('${VIEW_MODULE}')] = '${viewModule}';\n`;
}

/**
 * Inject declared CSS imports and stamp CSF story files.
 */
export function transformRadiantStoryModule(code: string, moduleId: string, root: string): string | null {
	if (!/export\s+default\s+meta\b/.test(code)) {
		return null;
	}

	let next = injectDeclaredCssImports(code);
	const metaViewStamp = appendMetaViewStamps(next, moduleId, root);
	if (metaViewStamp) {
		next = metaViewStamp;
	}

	if (hasStableStoryModuleStamp(next)) {
		return next === code ? null : next;
	}

	const modulePath = toViteSsrModulePath(moduleId, root);
	const stamped = `${next.trimEnd()}
if (!meta.parameters) meta.parameters = {};
meta.parameters.radiant = { ...(meta.parameters.radiant ?? {}), storyModule: '${modulePath}' };
`;

	return stamped === code ? null : stamped;
}
