/**
 * Compiles stylesheet sources into `dist/` with Tailwind v4 PostCSS.
 *
 * Emits plain CSS (no `@apply` / `@reference`) while keeping theme/token
 * custom properties as `var(--…)` so consumers can swap themes at runtime.
 * Does not minify — leave that to the app bundler.
 *
 * Run after `build:files` (or as part of `build:lib`).
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const STYLES_SRC = path.join(SRC, 'styles');
const STYLES_DIST = path.join(DIST, 'styles');
const UI_DIR = path.join(SRC, 'components', 'ui');

const processor = postcss([
	tailwindcss({
		optimize: false,
	}),
]);

function listCssFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...listCssFiles(full));
			continue;
		}
		if (entry.isFile() && entry.name.endsWith('.css')) {
			out.push(full);
		}
	}
	return out;
}

function listComponentStyleFiles(): string[] {
	return readdirSync(UI_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(UI_DIR, entry.name, `${entry.name}.css`))
		.filter((cssPath) => {
			try {
				return statSync(cssPath).isFile();
			} catch {
				return false;
			}
		});
}

async function compileCss(from: string, to: string): Promise<void> {
	const css = readFileSync(from, 'utf8');
	const result = await processor.process(css, { from, to });
	mkdirSync(path.dirname(to), { recursive: true });
	writeFileSync(to, result.css);
}

async function main(): Promise<void> {
	const styleFiles = listCssFiles(STYLES_SRC);
	const componentFiles = listComponentStyleFiles();

	const jobs: Array<Promise<void>> = [];

	for (const from of styleFiles) {
		const relative = path.relative(STYLES_SRC, from);
		jobs.push(compileCss(from, path.join(STYLES_DIST, relative)));
	}

	for (const from of componentFiles) {
		const relative = path.relative(path.join(SRC, 'components', 'ui'), from);
		jobs.push(compileCss(from, path.join(DIST, 'components', 'ui', relative)));
	}

	await Promise.all(jobs);

	console.log(
		`[copy-styles] compiled ${styleFiles.length} style + ${componentFiles.length} component CSS files to dist/`,
	);
}

main().catch((error: unknown) => {
	console.error('[copy-styles] failed');
	console.error(error);
	process.exitCode = 1;
});
