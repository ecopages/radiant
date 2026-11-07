import { describe, expect, it } from 'vitest';
import { DOCS_DEFAULT_THEME_TUNING } from '@/lib/docs-default-theme-tuning';
import { docsFontFromRow } from '@/lib/docs-fonts';
import { createThemeSearch, createThemeSpec } from './theme-spec';

const inter = docsFontFromRow(['inter', 'Inter', 'sans-serif', 1]);
const base = { theme: 'rui-default', tuning: DOCS_DEFAULT_THEME_TUNING, fonts: {} } as const;

describe('createThemeSearch', () => {
	it('is empty for an untouched Radiant Default', () => {
		expect(createThemeSearch(base)).toBe('');
	});

	it('carries a theme, but no tuning, for other themes', () => {
		const search = createThemeSearch({
			...base,
			theme: 'zed',
			tuning: { ...DOCS_DEFAULT_THEME_TUNING, primaryHue: 10 },
		});
		expect(search).toBe('?rui-theme=zed');
	});

	it('carries only changed tuning values and the font ids', () => {
		const search = createThemeSearch({
			...base,
			tuning: { ...DOCS_DEFAULT_THEME_TUNING, primaryHue: 150, neutralTint: 2.5 },
			fonts: { sans: inter },
		});
		expect(search).toBe('?rui-primary-hue=150&rui-neutral-tint=2.5&rui-font-sans=inter');
	});
});

describe('createThemeSpec', () => {
	it('describes install commands, stylesheet, fonts, tuning and the link', () => {
		const spec = createThemeSpec({
			...base,
			tuning: { ...DOCS_DEFAULT_THEME_TUNING, primaryHue: 150 },
			fonts: { sans: inter },
		});
		expect(spec.packages).toEqual(['@ecopages/radiant-ui', '@fontsource-variable/inter']);
		expect(spec.install.npm).toBe('npm install @ecopages/radiant-ui @fontsource-variable/inter');
		expect(spec.css).toContain('--rui-primary: oklch(52% 0.19 150)');
		expect(spec.tuning).toEqual({ primaryHue: 150 });
		expect(spec.fonts).toEqual([{ role: 'sans', family: 'Inter Variable', package: '@fontsource-variable/inter' }]);
		expect(spec.query).toBe('?rui-primary-hue=150&rui-font-sans=inter');
	});
});
