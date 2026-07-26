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

/**
 * Append view module metadata to `defineRadiantView` exports.
 */
export function appendRadiantViewModuleStamps(code: string, moduleId: string, root: string): string | null {
	if (hasStableViewModuleStamp(code)) {
		return null;
	}

	const exports = findRadiantViewExports(code);
	if (!exports.length) {
		return null;
	}

	const modulePath = toViteSsrModulePath(moduleId, root);
	const stamps = exports.map((name) => `${name}[Symbol.for('${VIEW_MODULE}')] = '${modulePath}';`).join('\n');

	return `${code.trimEnd()}\n${stamps}\n`;
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
