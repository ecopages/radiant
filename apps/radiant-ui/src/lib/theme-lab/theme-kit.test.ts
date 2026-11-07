import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DOCS_DEFAULT_THEME_TUNING } from '@/lib/docs-default-theme-tuning';
import { docsFontFromRow, type DocsFontCatalogRow } from '@/lib/docs-fonts';
import { createThemeKit, createThemeKitInstallCommand } from './theme-kit';

const inter = docsFontFromRow(['inter', 'Inter', 'sans-serif', 1]);
const lilex = docsFontFromRow(['lilex', 'Lilex', 'monospace', 0]);

describe('docsFontFromRow', () => {
	it('names variable packages and families the way Fontsource does', () => {
		expect(inter).toMatchObject({ pkg: '@fontsource-variable/inter', family: 'Inter Variable', kind: 'sans' });
	});

	it('keeps the plain family for static packages and flags monospace', () => {
		expect(lilex).toMatchObject({ pkg: '@fontsource/lilex', family: 'Lilex', kind: 'mono' });
		expect(lilex.fallback).toContain('ui-monospace');
	});

	it('picks a fallback that fits the category', () => {
		expect(docsFontFromRow(['lora', 'Lora', 'serif', 1]).fallback).toContain('serif');
		expect(docsFontFromRow(['pacifico', 'Pacifico', 'handwriting', 0]).fallback).toBe('cursive');
	});
});

describe('font catalog', () => {
	const rows = JSON.parse(
		readFileSync(fileURLToPath(new URL('../../public/assets/font-catalog.json', import.meta.url)), 'utf8'),
	) as DocsFontCatalogRow[];

	it('holds well-formed rows with unique ids', () => {
		expect(rows.length).toBeGreaterThan(1000);
		expect(
			rows.every(
				([id, family, category, variable]) => id && family && category && (variable === 0 || variable === 1),
			),
		).toBe(true);
		expect(new Set(rows.map((row) => row[0])).size).toBe(rows.length);
	});

	it('has no icon fonts and includes the fonts the themes name', () => {
		const ids = new Set(rows.map((row) => row[0]));
		expect(rows.some((row) => row[2] === 'icons')).toBe(false);
		for (const id of ['inter', 'geist', 'ibm-plex-sans', 'lilex', 'roboto', 'jetbrains-mono'])
			expect(ids.has(id)).toBe(true);
	});
});

describe('createThemeKit', () => {
	it('emits only the imports for an untouched default theme', () => {
		const kit = createThemeKit({ theme: 'rui-default', fonts: {}, tuning: DOCS_DEFAULT_THEME_TUNING });
		expect(kit.packages).toEqual(['@ecopages/radiant-ui']);
		expect(kit.css).toBe(
			"@import 'tailwindcss';\n@import '@ecopages/radiant-ui/themes/default';\n@import '@ecopages/radiant-ui/styles.css';\n",
		);
	});

	it('adds radiant-themes, font packages and overrides after styles.css', () => {
		const kit = createThemeKit({ theme: 'zed', fonts: { sans: inter, heading: inter, mono: lilex } });
		expect(kit.packages).toEqual([
			'@ecopages/radiant-ui',
			'@ecopages/radiant-themes',
			'@fontsource-variable/inter',
			'@fontsource/lilex',
		]);
		expect(kit.css.indexOf("@import '@fontsource-variable/inter'")).toBeLessThan(
			kit.css.indexOf('radiant-themes/zed'),
		);
		expect(kit.css.indexOf('styles.css')).toBeLessThan(kit.css.indexOf(':root {'));
		expect(kit.css).toContain("--font-sans: 'Inter Variable', ui-sans-serif");
		expect(kit.css).toContain("--font-mono: 'Lilex', ui-monospace");
	});

	it('includes tuning only for Radiant Default', () => {
		const tuning = { ...DOCS_DEFAULT_THEME_TUNING, primaryHue: 150 };
		expect(createThemeKit({ theme: 'rui-default', fonts: {}, tuning }).css).toContain(
			'--rui-primary: oklch(52% 0.19 150)',
		);
		expect(createThemeKit({ theme: 'github', fonts: {}, tuning }).css).not.toContain('--rui-primary');
	});

	it('accepts a monospace font for body text and its mono fallback', () => {
		const kit = createThemeKit({ theme: 'github', fonts: { sans: lilex } });
		expect(kit.css).toContain("--font-sans: 'Lilex', ui-monospace");
	});

	it('ignores a proportional font in the code role', () => {
		const kit = createThemeKit({ theme: 'github', fonts: { mono: inter } });
		expect(kit.css).not.toContain('--font-');
	});
});

describe('createThemeKitInstallCommand', () => {
	it('uses each package manager verb', () => {
		expect(createThemeKitInstallCommand('npm', ['a', 'b'])).toBe('npm install a b');
		expect(createThemeKitInstallCommand('yarn', ['a'])).toBe('yarn add a');
		expect(createThemeKitInstallCommand('bun', ['a'])).toBe('bun add a');
		expect(createThemeKitInstallCommand('pnpm', ['a'])).toBe('pnpm add a');
	});
});
