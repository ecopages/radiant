import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { DocsTokenPackCss } from './docs-theme-preview';

const require = createRequire(import.meta.url);
const IMPORT_RE = /@import\s+['"]([^'"]+)['"]\s*;/g;

/**
 * Inlines relative `@import` so injected `<style>` tags do not fetch sibling files.
 */
function loadCss(filePath: string, seen = new Set<string>()): string {
	if (seen.has(filePath)) return '';
	seen.add(filePath);
	return readFileSync(filePath, 'utf8').replace(IMPORT_RE, (_match, specifier: string) => {
		if (!specifier.startsWith('.')) {
			throw new Error(`Unsupported token pack @import: ${specifier}`);
		}
		return loadCss(join(dirname(filePath), specifier), seen);
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
		spacing: {
			compact: loadCss(resolvePack('@ecopages/radiant-ui/tokens/spacing/compact')),
			wide: loadCss(resolvePack('@ecopages/radiant-ui/tokens/spacing/wide')),
		},
		radius: {
			soft: loadCss(resolvePack('@ecopages/radiant-ui/tokens/radius/soft')),
			sharp: loadCss(resolvePack('@ecopages/radiant-ui/tokens/radius/sharp')),
		},
	};
}
