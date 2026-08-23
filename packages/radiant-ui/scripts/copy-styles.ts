/**
 * Compiles component-facing stylesheet sources into `dist/` with Tailwind v4 PostCSS.
 *
 * Theme and token sources are copied unchanged so consuming Tailwind builds can
 * register their `@theme` utilities. Component CSS is emitted as plain CSS
 * (without `@apply` / `@reference`). Neither path is minified.
 *
 * Run after `build:files` (or as part of `build:lib`).
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { listComponentCssFiles } from './component-style-files.ts';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const STYLES_SRC = path.join(SRC, 'styles');
const STYLES_DIST = path.join(DIST, 'styles');
const STYLE_DEPENDENCIES = 'style-dependencies.json';
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
		.flatMap((entry) => {
			const dir = path.join(UI_DIR, entry.name);
			return listComponentCssFiles(dir)
				.map((filename) => path.join(dir, filename))
				.filter((cssPath) => {
					try {
						return statSync(cssPath).isFile();
					} catch {
						return false;
					}
				});
		});
}

function isTailwindReferenceSource(relativePath: string): boolean {
	return relativePath.startsWith(`themes${path.sep}`) || relativePath.startsWith(`tokens${path.sep}`);
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
		const to = path.join(STYLES_DIST, relative);

		if (isTailwindReferenceSource(relative)) {
			mkdirSync(path.dirname(to), { recursive: true });
			writeFileSync(to, readFileSync(from, 'utf8'));
		} else {
			jobs.push(compileCss(from, to));
		}
	}

	for (const from of componentFiles) {
		const relative = path.relative(path.join(SRC, 'components', 'ui'), from);
		jobs.push(compileCss(from, path.join(DIST, 'components', 'ui', relative)));
	}

	mkdirSync(STYLES_DIST, { recursive: true });
	copyFileSync(path.join(STYLES_SRC, STYLE_DEPENDENCIES), path.join(STYLES_DIST, STYLE_DEPENDENCIES));

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
