/**
 * Copies stylesheet sources into `dist/` for package exports.
 * Run after `build:files` (or as part of `build:lib`).
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const STYLES_SRC = path.join(SRC, 'styles');
const STYLES_DIST = path.join(DIST, 'styles');
const UI_DIR = path.join(SRC, 'components', 'ui');

function listComponents(): string[] {
	return readdirSync(UI_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(path.join(UI_DIR, entry.name, 'index.ts')))
		.map((entry) => entry.name)
		.sort();
}

function copyComponentStyles(): void {
	for (const name of listComponents()) {
		const cssPath = path.join(UI_DIR, name, `${name}.css`);
		if (!existsSync(cssPath)) continue;
		const outDir = path.join(DIST, 'components', 'ui', name);
		mkdirSync(outDir, { recursive: true });
		copyFileSync(cssPath, path.join(outDir, `${name}.css`));
	}
}

mkdirSync(STYLES_DIST, { recursive: true });
cpSync(STYLES_SRC, STYLES_DIST, { recursive: true });
copyComponentStyles();

console.log('[copy-styles] copied styles and component CSS to dist/');
