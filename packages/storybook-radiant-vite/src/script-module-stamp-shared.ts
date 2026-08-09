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
 * Collect relative `*.css` paths from `stylesheets: [...]` literals (e.g. `radiantMeta`).
 */
export function collectDeclaredStylesheetImports(code: string): string[] {
	const paths = [...code.matchAll(/stylesheets:\s*\[([^\]]*)\]/g)].flatMap((match) =>
		[...match[1]!.matchAll(/['"]((?:\.\.?\/)+[^'"]+\.css)['"]/g)].map((pathMatch) => pathMatch[1]!),
	);

	return [...new Set(paths)];
}

/**
 * Prepend side-effect CSS imports declared on CSF Meta (Storybook-only).
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

function findRadiantMetaComponentExport(code: string): string | null {
	const metaLiteral = code.match(/const\s+meta\s*=\s*\{[\s\S]*?\};/);
	if (metaLiteral) {
		const fromMeta = metaLiteral[0].match(/\bcomponent:\s*(\w+)/);
		if (fromMeta?.[1]) {
			return fromMeta[1];
		}
	}

	const legacy = code.match(/radiantMeta\s*\(\s*\{[\s\S]*?\bcomponent:\s*(\w+)/);
	return legacy?.[1] ?? null;
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
 * Stamp `meta.component` with a view module path for SSR when stories use `radiantMeta`.
 */
export function appendRadiantMetaViewStamps(code: string, moduleId: string, root: string): string | null {
	if (!code.includes('radiantMeta(')) {
		return null;
	}

	const component = findRadiantMetaComponentExport(code);
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
	if (!/export\s+default\s+meta\b/.test(code) && !/export\s+default\s+radiantMeta/.test(code)) {
		return null;
	}

	let next = injectDeclaredStylesheetImports(code);
	const metaViewStamp = appendRadiantMetaViewStamps(next, moduleId, root);
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
