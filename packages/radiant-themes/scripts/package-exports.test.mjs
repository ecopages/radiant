import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import postcss from 'postcss';

const packageRoot = path.resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));

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
			assert.notEqual(rule.name, 'reference', `${name} has no unresolved Tailwind references`);
		});
		assert.doesNotMatch(css, /@apply\b/, `${name} has no unresolved Tailwind apply directives`);
	}
});

test('compact entries apply the compact spacing scale over the full theme', () => {
	for (const name of Object.keys(packageJson.exports)) {
		const theme = name.match(/^\.\/compiled\/([^/]+)\/compact\.css$/)?.[1];
		if (!theme) continue;
		const full = readFileSync(path.join(packageRoot, `dist/compiled/themes/${theme}.css`), 'utf8');
		const compact = readFileSync(path.join(packageRoot, `dist/compiled/themes/${theme}/compact.css`), 'utf8');
		const lastSpace1 = (css) => [...css.matchAll(/--space-1:\s*([^;]+);/g)].at(-1)?.[1];
		assert.notEqual(lastSpace1(compact), lastSpace1(full), `${theme}/compact overrides the full spacing scale`);
	}
});
