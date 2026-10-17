import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src');
const output = path.join(root, 'dist');

rmSync(output, { force: true, recursive: true });
mkdirSync(output, { recursive: true });
cpSync(source, output, { recursive: true });

const require = createRequire(import.meta.url);
const tailwindcss = require('@tailwindcss/postcss');
const themeSource = path.join(source, 'themes');
const compiledRoot = path.join(output, 'compiled', 'themes');

function listCssFiles(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const file = path.join(directory, entry.name);
		return entry.isDirectory() ? listCssFiles(file) : entry.name.endsWith('.css') ? [file] : [];
	});
}

function resolveImport(specifier, importer) {
	return specifier.startsWith('.') ? path.resolve(path.dirname(importer), specifier) : require.resolve(specifier);
}

function inlineImports(file, seen = new Set()) {
	if (seen.has(file)) return '';
	seen.add(file);
	const root = postcss.parse(readFileSync(file, 'utf8'), { from: file });
	root.walkAtRules('import', (rule) => {
		const specifier = rule.params.match(/^['"]([^'"]+)['"]$/)?.[1];
		if (!specifier) throw new Error(`Unsupported theme import: ${rule.params}`);
		rule.replaceWith(postcss.parse(inlineImports(resolveImport(specifier, file), seen)));
	});
	return root.toString();
}

for (const file of listCssFiles(themeSource)) {
	const relative = path.relative(themeSource, file);
	const compiledFile = path.join(compiledRoot, relative);
	mkdirSync(path.dirname(compiledFile), { recursive: true });
	const authored = postcss.parse(inlineImports(file), { from: file });
	const compiled = await postcss([tailwindcss()]).process(authored.toString(), { from: file, map: false });
	writeFileSync(compiledFile, compiled.css);
}

console.log('[radiant-themes] copied composable sources and compiled browser-ready theme CSS to dist/');
