/**
 * Builds the radiant-ui library into `dist/`.
 *
 * Bundles every `src/components/ui/<name>/index.ts` (plus the root barrel)
 * as browser-targeted ESM with `@ecopages/*` external.
 *
 * Run with: pnpm run build:files
 */
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(import.meta.dirname, '..');
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
	'*.css',
];

function listComponentEntries(): string[] {
	return readdirSync(UI_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(UI_DIR, entry.name, 'index.ts'))
		.filter((indexPath) => existsSync(indexPath))
		.sort();
}

try {
	await esbuild.build({
		absWorkingDir: ROOT,
		bundle: true,
		entryPoints: [path.join(SRC, 'index.ts'), ...listComponentEntries()],
		external: externalPackages,
		format: 'esm',
		logLevel: 'silent',
		minify: true,
		outbase: SRC,
		outdir: DIST,
		platform: 'browser',
		sourcemap: true,
	});
} catch (error) {
	console.error('[radiant-ui]', error);
	process.exitCode = 1;
}
