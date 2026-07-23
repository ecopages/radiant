/**
 * Builds the radiant-ui library into `dist/`.
 *
 * Bundles every `src/components/ui/<name>/index.ts` (plus the root barrel)
 * as browser-targeted ESM with `@ecopages/*` and `@floating-ui/dom` external.
 *
 * Component CSS imports stay external in the emitted JS. Compiling and
 * bundling the stylesheets is a separate effort; Storybook resolves CSS
 * through Vite during development.
 *
 * Types are emitted separately by `npm run build:types` (tsc).
 *
 * Run with: bun run build:files
 */
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const UI_DIR = path.join(SRC, 'components', 'ui');

const externalPackages = [
	'@ecopages/jsx',
	'@ecopages/jsx/*',
	'@ecopages/radiant',
	'@ecopages/radiant/*',
	'@ecopages/signals',
	'@ecopages/signals/*',
	'@floating-ui/dom',
	'*.css',
];

function listComponentEntries(): string[] {
	return readdirSync(UI_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(UI_DIR, entry.name, 'index.ts'))
		.filter((indexPath) => existsSync(indexPath))
		.sort();
}

const result = await Bun.build({
	entrypoints: [path.join(SRC, 'index.ts'), ...listComponentEntries()],
	outdir: DIST,
	root: SRC,
	target: 'browser',
	minify: true,
	format: 'esm',
	external: externalPackages,
	sourcemap: 'external',
});

if (!result.success) {
	for (const log of result.logs) console.error('[radiant-ui]', log);
	process.exitCode = 1;
}
