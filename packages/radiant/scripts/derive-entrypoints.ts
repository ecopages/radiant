/**
 * Maps `package.json` exports to browser vs server esbuild entrypoints.
 *
 * Server paths never join browser entry lists (no server code in client dist). Shared
 * `core/` and client modules may still be imported from server sources at bundle time.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

type PackageJsonExport = string | { import?: string; types?: string };

export type DerivedEntrypoints = {
	browserSubpathEntrypoints: string[];
	serverEntrypoints: string[];
};

function stripDistPrefix(value: string): string {
	if (value.startsWith('./dist/')) {
		return `./${value.slice('./dist/'.length)}`;
	}

	if (value.startsWith('dist/')) {
		return `./${value.slice('dist/'.length)}`;
	}

	return value;
}

function distImportToSrcEntry(distImport: string): string {
	const normalized = stripDistPrefix(distImport);

	if (!normalized.endsWith('.js')) {
		throw new Error(`[@ecopages/radiant] Expected a .js export target, got ${JSON.stringify(distImport)}.`);
	}

	const relativePath = normalized.startsWith('./') ? normalized.slice(2) : normalized;
	return `src/${relativePath.slice(0, -3)}.ts`;
}

function isServerEntrypoint(srcEntry: string): boolean {
	return srcEntry.startsWith('src/server/') || srcEntry.includes('/server/');
}

export function deriveEntrypoints(
	packageRoot: string,
	exportsField: Record<string, PackageJsonExport>,
): DerivedEntrypoints {
	const browserSubpathEntrypoints: string[] = [];
	const serverEntrypoints: string[] = [];

	for (const [exportKey, exportValue] of Object.entries(exportsField)) {
		if (exportKey === '.' || exportKey === './package.json') {
			continue;
		}

		if (typeof exportValue === 'string') {
			continue;
		}

		const importPath = exportValue.import;

		if (!importPath) {
			continue;
		}

		const srcEntry = distImportToSrcEntry(importPath);
		const absoluteSrc = path.join(packageRoot, srcEntry);

		if (!existsSync(absoluteSrc)) {
			throw new Error(
				`[@ecopages/radiant] Export ${exportKey} maps to missing source file ${srcEntry} (from ${importPath}).`,
			);
		}

		if (srcEntry === 'src/index.ts') {
			continue;
		}

		if (isServerEntrypoint(srcEntry)) {
			serverEntrypoints.push(srcEntry);
			continue;
		}

		browserSubpathEntrypoints.push(srcEntry);
	}

	browserSubpathEntrypoints.sort();
	serverEntrypoints.sort();

	return { browserSubpathEntrypoints, serverEntrypoints };
}
