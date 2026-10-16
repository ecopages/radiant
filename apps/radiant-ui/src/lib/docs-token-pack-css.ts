import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { DocsTokenPackCss } from './docs-theme-preview';

const require = createRequire(import.meta.url);
const IMPORT_RE = /@import\s+['"]([^'"]+)['"]\s*;/g;

/**
 * Inlines package and relative imports so injected `<style>` tags stay self-contained.
 */
function loadCss(filePath: string, seen = new Set<string>()): string {
	if (seen.has(filePath)) return '';
	seen.add(filePath);
	return readFileSync(filePath, 'utf8').replace(IMPORT_RE, (_match, specifier: string) => {
		const importedFile = specifier.startsWith('.')
			? join(dirname(filePath), specifier)
			: createRequire(filePath).resolve(specifier);
		return loadCss(importedFile, seen);
	});
}

function resolvePack(specifier: string): string {
	return require.resolve(specifier);
}

/**
 * Published spacing/radius pack CSS, with relative imports inlined.
 *
 * @remarks Used by the HTML boot script so the docs preview layers the same
 * files applications `@import`, instead of a hand-copied token-preview sheet.
 */
export function readDocsTokenPackCss(): DocsTokenPackCss {
	return {
		themes: {
			github: loadCss(resolvePack('@ecopages/radiant-themes/compiled/github.css')),
			vscode: loadCss(resolvePack('@ecopages/radiant-themes/compiled/vscode.css')),
			vercel: loadCss(resolvePack('@ecopages/radiant-themes/compiled/vercel.css')),
		},
		spacing: {
			compact: loadCss(resolvePack('@ecopages/radiant-ui/tokens/spacing/compact')),
			wide: loadCss(resolvePack('@ecopages/radiant-ui/tokens/spacing/wide')),
		},
		radius: {
			sharp: loadCss(resolvePack('@ecopages/radiant-ui/tokens/radius/sharp')),
		},
	};
}
