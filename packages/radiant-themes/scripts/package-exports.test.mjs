import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import postcss from 'postcss';

const packageRoot = path.resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));

function declarationsForSelector(css, selector) {
	const declarations = new Map();
	postcss.parse(css).walkRules((rule) => {
		if (rule.selector !== selector) return;
		rule.walkDecls((declaration) => declarations.set(declaration.prop, declaration.value));
	});
	return declarations;
}

test('every public theme export points to a built file', () => {
	for (const [name, entry] of Object.entries(packageJson.exports)) {
		if (name === './package.json') continue;
		const target = typeof entry === 'string' ? entry : entry.default;
		assert.ok(target, `${name} has a default export target`);
		assert.ok(target.startsWith('./dist/'), `${name} targets built package output`);
		assert.ok(existsSync(path.join(packageRoot, target)), `${name} resolves to ${target}`);
	}
});

test('compiled theme and variant exports contain no unresolved build directives', () => {
	for (const [name, entry] of Object.entries(packageJson.exports)) {
		if (!name.startsWith('./compiled/')) continue;
		const css = readFileSync(path.join(packageRoot, entry.default), 'utf8');
		const root = postcss.parse(css, { from: name });
		root.walkAtRules((rule) => {
			assert.notEqual(rule.name, 'import', `${name} has no unresolved CSS imports`);
			assert.notEqual(rule.name, 'theme', `${name} has no unresolved Tailwind theme blocks`);
		});
	}
});

test('GitHub and VS Code palettes apply dark colors and light gray ramps', () => {
	for (const [name, darkCanvas] of [
		['github', '#0d1117'],
		['vscode', '#1f1f1f'],
	]) {
		const css = readFileSync(path.join(packageRoot, `dist/compiled/themes/${name}.css`), 'utf8');
		const light = declarationsForSelector(css, ':where(:root)');
		const dark = declarationsForSelector(css, ':where(.dark)');
		const canvas = `--color-${name}-canvas`;

		assert.equal(light.get(canvas), '#ffffff');
		assert.equal(dark.get(canvas), darkCanvas);
		assert.equal(light.get('--gray-950'), `var(--color-${name}-fg)`);
		assert.ok(light.get('--gray-900').includes(`var(--color-${name}-fg)`));
		assert.notEqual(light.get('--gray-50'), light.get('--gray-900'));
		assert.ok(dark.get('--gray-50').includes('white'));
		assert.equal(dark.get('--gray-950'), `var(${canvas})`);
	}
});

test('Radiant UI exposes one complete theme entry', () => {
	const uiPackage = JSON.parse(readFileSync(path.resolve(packageRoot, '../radiant-ui/package.json'), 'utf8'));
	const themeExports = Object.keys(uiPackage.exports).filter((name) => /^\.\/themes\/[^/]+$/.test(name));
	assert.deepEqual(themeExports, ['./themes/default']);
});

test('optional themes export only the curated GitHub, VS Code, and Vercel catalog', () => {
	const themeExports = Object.keys(packageJson.exports).filter((name) =>
		/^\.\/(github|vscode|vercel)(?:\/compact)?$/.test(name),
	);
	assert.deepEqual(themeExports, [
		'./github',
		'./github/compact',
		'./vscode',
		'./vscode/compact',
		'./vercel',
		'./vercel/compact',
	]);
});

test('Vercel exposes its component-state layer in full and compact variants', () => {
	const fullTheme = readFileSync(path.join(packageRoot, 'dist/compiled/themes/vercel.css'), 'utf8');
	const compactTheme = readFileSync(path.join(packageRoot, 'dist/compiled/themes/vercel/compact.css'), 'utf8');
	for (const token of [
		'--rui-control-background-hover:',
		'--rui-control-background-active:',
		'--rui-control-border-hover:',
	]) {
		assert.ok(fullTheme.includes(token), `Vercel theme exposes ${token}`);
		assert.ok(compactTheme.includes(token), `Vercel Compact exposes ${token}`);
	}
	assert.ok(compactTheme.includes('--space-1: calc(0.125rem * var(--rui-density))'));
});
