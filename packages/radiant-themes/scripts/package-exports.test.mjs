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
		if (rule.selector.replaceAll(/\s+/g, ' ') !== selector) return;
		rule.walkDecls((declaration) => declarations.set(declaration.prop, declaration.value));
	});
	return declarations;
}

function rulesContainingSelector(css, selector) {
	const rules = [];
	postcss.parse(css).walkRules((rule) => {
		if (rule.selector.includes(selector)) rules.push(rule.toString());
	});
	return rules.join('\n');
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
			assert.notEqual(rule.name, 'reference', `${name} has no unresolved Tailwind references`);
		});
		assert.doesNotMatch(css, /@apply\b/, `${name} has no unresolved Tailwind apply directives`);
	}
});

test('GitHub and VS Code palettes apply dark colors and light gray ramps', () => {
	for (const [name, darkCanvas] of [
		['github', '#0d1117'],
		['vscode', '#1f1f1f'],
	]) {
		const css = readFileSync(path.join(packageRoot, `dist/compiled/themes/${name}.css`), 'utf8');
		const light = declarationsForSelector(css, `:where(:root), :root[data-rui-theme='${name}']`);
		const dark = declarationsForSelector(css, `:where(.dark), :root.dark[data-rui-theme='${name}']`);
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

test('GitHub follows Primer action roles and Cloudflare leads with its orange', () => {
	const github = readFileSync(path.join(packageRoot, 'dist/compiled/themes/github.css'), 'utf8');
	const githubRoles = declarationsForSelector(github, ":where(:root), :root[data-rui-theme='github']");
	assert.equal(githubRoles.get('--primary'), 'var(--color-github-green)');
	assert.equal(githubRoles.get('--success'), 'var(--color-github-green)');
	assert.equal(githubRoles.get('--secondary'), 'var(--color-github-subtle)');
	assert.equal(githubRoles.get('--info'), 'var(--color-github-blue)');

	const cloudflare = readFileSync(path.join(packageRoot, 'dist/compiled/themes/cloudflare.css'), 'utf8');
	const cloudflareRoot = declarationsForSelector(cloudflare, ":where(:root), :root[data-rui-theme='cloudflare']");
	const cloudflareDark = declarationsForSelector(
		cloudflare,
		":where(.dark), :root.dark[data-rui-theme='cloudflare']",
	);
	assert.equal(cloudflareRoot.get('--color-cloudflare-orange-bright'), '#ff5e1e');
	assert.equal(cloudflareRoot.get('--color-cloudflare-orange'), '#cc3a00');
	assert.equal(cloudflareDark.get('--color-cloudflare-orange'), '#cc3a00');
	assert.equal(cloudflareDark.get('--on-primary'), 'white');
	assert.equal(cloudflareRoot.get('--primary'), 'var(--color-cloudflare-orange)');
	assert.equal(cloudflareRoot.get('--link'), 'var(--color-cloudflare-blue)');
	assert.equal(cloudflareRoot.get('--secondary'), 'var(--color-cloudflare-recessed)');
	assert.equal(cloudflareRoot.get('--success'), 'var(--color-cloudflare-green)');
	assert.equal(cloudflareRoot.get('--warning'), 'var(--color-cloudflare-amber-text)');
});

test('High Contrast gives switch thumbs square corners', () => {
	const highContrast = readFileSync(path.join(packageRoot, 'dist/compiled/themes/high-contrast.css'), 'utf8');
	const thumb = declarationsForSelector(highContrast, ':root .rui-switch__thumb');
	assert.equal(thumb.get('border-radius'), 'var(--radius-none)');
});

test('classic themes compile their scrollbar chrome', () => {
	for (const suffix of ['', '/compact']) {
		const windows95 = readFileSync(path.join(packageRoot, `dist/compiled/themes/windows95${suffix}.css`), 'utf8');
		assert.match(windows95, /::-webkit-scrollbar-track/);
		assert.match(windows95, /::-webkit-scrollbar-button/);
		assert.match(windows95, /::-webkit-scrollbar-button:single-button/);
		assert.match(rulesContainingSelector(windows95, '::-webkit-scrollbar-thumb'), /border-radius: 0/);
		assert.match(windows95, /scrollbar-color: var\(--windows95-field-text\) var\(--windows95-face\)/);
		assert.doesNotMatch(windows95, /@supports selector\(::-webkit-scrollbar\)/);

		const macosClassic = readFileSync(
			path.join(packageRoot, `dist/compiled/themes/macos-classic${suffix}.css`),
			'utf8',
		);
		assert.match(macosClassic, /::-webkit-scrollbar-track/);
		assert.match(macosClassic, /::-webkit-scrollbar-button:end/);
		assert.match(rulesContainingSelector(macosClassic, '::-webkit-scrollbar-thumb'), /border-radius: 0/);
		assert.match(macosClassic, /radial-gradient\(circle at 0\.5px 0\.5px/);
		assert.match(macosClassic, /::-webkit-scrollbar-thumb:vertical/);
		assert.doesNotMatch(macosClassic, /@supports selector\(::-webkit-scrollbar\)/);

		const macosClassicDark = declarationsForSelector(
			macosClassic,
			":where(.dark), :root.dark[data-rui-theme='macos-classic']",
		);
		assert.equal(macosClassicDark.get('--macos-classic-scrollbar-thumb'), 'var(--macos-classic-selection)');
	}
});

test('Radiant UI exposes one complete theme entry', () => {
	const uiPackage = JSON.parse(readFileSync(path.resolve(packageRoot, '../radiant-ui/package.json'), 'utf8'));
	const themeExports = Object.keys(uiPackage.exports).filter((name) => /^\.\/themes\/[^/]+$/.test(name));
	assert.deepEqual(themeExports, ['./themes/default']);
});

test('optional themes export the curated product and accessibility catalog', () => {
	const themeExports = Object.keys(packageJson.exports).filter((name) =>
		/^\.\/(github|cloudflare|vscode|vercel|material|high-contrast|windows95|macos-classic|macos)(?:\/compact)?$/.test(
			name,
		),
	);
	assert.deepEqual(themeExports, [
		'./github',
		'./github/compact',
		'./cloudflare',
		'./cloudflare/compact',
		'./vscode',
		'./vscode/compact',
		'./material',
		'./material/compact',
		'./vercel',
		'./vercel/compact',
		'./high-contrast',
		'./high-contrast/compact',
		'./windows95',
		'./windows95/compact',
		'./macos-classic',
		'./macos-classic/compact',
		'./macos',
		'./macos/compact',
	]);
});

test('themes compile their component-specific shape values and optional component styles', () => {
	for (const name of [
		'github',
		'cloudflare',
		'vscode',
		'vercel',
		'material',
		'high-contrast',
		'windows95',
		'macos-classic',
		'macos',
	]) {
		const fullTheme = readFileSync(path.join(packageRoot, `dist/compiled/themes/${name}.css`), 'utf8');
		const compactTheme = readFileSync(path.join(packageRoot, `dist/compiled/themes/${name}/compact.css`), 'utf8');
		assert.match(fullTheme, /--font-sans:/, `${name} defines its own font stack`);
		assert.match(fullTheme, /--font-heading:/, `${name} defines its own heading font stack`);
		assert.match(fullTheme, /--font-mono:/, `${name} defines its own monospace font stack`);
		assert.match(fullTheme, /--radius-control:/, `${name} owns a control radius`);
		assert.match(fullTheme, /--radius-container:/, `${name} owns a container radius`);
		assert.doesNotMatch(fullTheme, /tokens\/radius\/(?:soft|sharp)/, `${name} does not import a shared shape pack`);
		for (const [theme, label] of [
			[fullTheme, 'full'],
			[compactTheme, 'compact'],
		]) {
			if (
				[
					'github',
					'cloudflare',
					'vscode',
					'material',
					'high-contrast',
					'windows95',
					'macos-classic',
					'macos',
				].includes(name)
			) {
				assert.match(theme, /\.rui-button/);
				assert.match(theme, /\.rui-input/);
				assert.match(theme, /\.rui-dialog__surface/);
			}
			assert.match(
				theme,
				label === 'compact'
					? /--space-1: calc\(0\.125rem \* var\(--rui-density\)\)/
					: /--space-1: calc\(0\.25rem \* var\(--rui-density\)\)/,
				`${name} ${label} has the expected spacing scale`,
			);
		}
	}
});
