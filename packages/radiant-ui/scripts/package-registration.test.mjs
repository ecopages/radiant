import assert from 'node:assert/strict';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

function declarationFiles(directory) {
	const files = [];

	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const entryPath = join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...declarationFiles(entryPath));
		} else if (entry.name.endsWith('.d.ts')) {
			files.push(entryPath);
		}
	}

	return files;
}

test('published declarations do not expose source path aliases', () => {
	const distPath = fileURLToPath(new URL('../dist/', import.meta.url));
	const aliasImports = declarationFiles(distPath).filter((file) => /['"]@\//.test(readFileSync(file, 'utf8')));

	assert.deepEqual(aliasImports, [], `Declaration files contain unresolved @/ imports:\n${aliasImports.join('\n')}`);
});

test('built custom-element declarations expose tag props to package consumers', () => {
	const here = fileURLToPath(new URL('.', import.meta.url));
	const packageRoot = resolve(here, '..');
	const repoRoot = resolve(packageRoot, '../..');
	const scratch = mkdtempSync(join(tmpdir(), 'radiant-ui-consumer-types-'));
	const scope = join(scratch, 'node_modules/@ecopages');

	try {
		mkdirSync(scope, { recursive: true });
		for (const name of ['jsx', 'radiant', 'signals']) {
			const dist = join(repoRoot, 'packages', name, 'dist');
			assert.ok(existsSync(join(dist, 'package.json')), `packages/${name}/dist is missing: build it first`);
			symlinkSync(dist, join(scope, name), 'dir');
		}
		symlinkSync(packageRoot, join(scope, 'radiant-ui'), 'dir');
		copyFileSync(join(here, 'consumer-types/consumer.tsx'), join(scratch, 'consumer.tsx'));
		writeFileSync(
			join(scratch, 'tsconfig.json'),
			JSON.stringify({
				extends: resolve(repoRoot, 'tsconfig.json'),
				compilerOptions: {
					declaration: true,
					emitDeclarationOnly: true,
					jsxImportSource: '@ecopages/jsx',
					noEmit: false,
					outDir: 'out',
					rootDir: '.',
				},
				include: ['consumer.tsx'],
			}),
		);

		const tsc = join(dirname(createRequire(import.meta.url).resolve('typescript/package.json')), 'bin/tsc');
		const result = spawnSync(process.execPath, [tsc, '-p', join(scratch, 'tsconfig.json')], { encoding: 'utf8' });
		assert.equal(result.status, 0, result.stderr || result.stdout);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
});

test('published default theme keeps its Radiant Default color and geometry controls', () => {
	const readStyle = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
	const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
	const theme = readStyle('../dist/styles/themes/default.css');
	const colors = readStyle('../dist/styles/tokens/colors/rui-default.css');
	const roles = readStyle('../dist/styles/tokens/presets/colors/rui-default.css');
	const spacing = readStyle('../dist/styles/tokens/spacing/default.css');
	const spacingScale = readStyle('../dist/styles/tokens/spacing/scale-bridge.css');
	const radius = readStyle('../dist/styles/tokens/radius/default.css');
	const themeExports = Object.keys(packageJson.exports).filter((key) => key.startsWith('./themes/'));

	assert.deepEqual(themeExports, ['./themes/default']);
	assert.match(theme, /--font-sans:/);
	assert.match(theme, /--font-heading:/);
	assert.match(theme, /--font-mono:/);
	assert.match(theme, /--rui-border-alpha:\s*20%/);
	assert.match(roles, /--rui-control-border-color:\s*var\(--color-rui-default-500\)/);
	assert.match(colors, /--rui-neutral:\s*oklch/);
	assert.match(colors, /--rui-primary:\s*oklch/);
	assert.match(colors, /oklch\(from var\(--rui-primary\)/);
	assert.match(colors, /--rui-secondary:\s*oklch/);
	assert.match(colors, /oklch\(from var\(--rui-secondary\)/);
	assert.match(roles, /--rui-border-color:\s*oklch\(from var\(--color-rui-default-900\) l c h\)/);
	assert.match(roles, /--border:\s*oklch\(from var\(--rui-border-color\) l c h \/ var\(--rui-border-alpha\)\)/);
	assert.match(spacingScale, /--rui-density:\s*1/);
	assert.match(spacing, /--space-1:\s*calc\(0\.25rem \* var\(--rui-density\)\)/);
	assert.match(radius, /--rui-radius-scale:\s*1/);
	assert.match(radius, /--border-radius-md:\s*calc\(0\.75rem \* var\(--rui-radius-scale\)\)/);
});

for (const [entry, view, value, expectedInputs] of [
	['date-field', 'RuiDateField', '2026-08-07', 1],
	['date-range-picker', 'RuiDateRangePicker', '2026-08-07/2026-08-14', 2],
]) {
	test(`${entry} registers and server-renders its nested hosts from the built package`, () => {
		const result = spawnSync(
			process.execPath,
			[
				'--input-type=module',
				'-e',
				`
import assert from 'node:assert/strict';
import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
const { ${view}: View } = await import('@ecopages/radiant-ui/${entry}');
for (const tag of ['rui-${entry}', 'rui-date-input', 'rui-calendar']) {
    assert.ok(customElements.get(tag), tag);
}
const html = withRadiantServerCustomElementRenderBridge(() =>
    renderToString(View({ value: '${value}', locale: 'en-US' }), { mode: 'hydrate' }),
);
const inputs = [...html.matchAll(/<rui-date-input\\b[\\s\\S]*?<\\/rui-date-input>/g)];
assert.equal(inputs.length, ${expectedInputs});
assert.ok(html.includes('data-calendar-grid'));
for (const [input] of inputs) {
    assert.ok(input.includes('data-date-segment'));
    assert.ok(input.includes('>2026</span>'));
}
`,
			],
			{ cwd: new URL('..', import.meta.url), encoding: 'utf8' },
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
	});
}

test('sidebar registers and server-renders rui-sidebar-trigger from the built package', () => {
	const result = spawnSync(
		process.execPath,
		[
			'--input-type=module',
			'-e',
			`
import assert from 'node:assert/strict';
import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
const { RuiSidebarTrigger } = await import('@ecopages/radiant-ui/sidebar');
assert.ok(customElements.get('rui-sidebar'));
assert.ok(customElements.get('rui-sidebar-trigger'));
const html = withRadiantServerCustomElementRenderBridge(() =>
    renderToString(RuiSidebarTrigger({ controls: 'docs-sidebar', placement: 'inset', triggerLabel: 'Open navigation' })),
);
assert.ok(html.includes('data-ref="button"'));
assert.ok(html.includes('placement="inset"'));
assert.ok(html.includes('>Open navigation') || html.includes('aria-label="Open navigation"'));
`,
		],
		{ cwd: new URL('..', import.meta.url), encoding: 'utf8' },
	);

	assert.equal(result.status, 0, result.stderr || result.stdout);
});
