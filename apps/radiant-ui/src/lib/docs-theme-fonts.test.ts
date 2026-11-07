import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { docsThemeDefaultFonts } from './docs-theme-fonts';
import { docsThemeColorOptions } from './docs-theme-preview';

const SYSTEM_LABELS = new Set(['System UI', 'System monospace']);

describe('docsThemeDefaultFonts', () => {
	it('covers every docs theme', () => {
		expect(Object.keys(docsThemeDefaultFonts).sort()).toEqual(
			docsThemeColorOptions.map((option) => option.value).sort(),
		);
	});

	it('names a family the theme stack actually lists', () => {
		for (const [theme, fonts] of Object.entries(docsThemeDefaultFonts)) {
			if (theme === 'rui-default') continue;
			const css = readFileSync(
				fileURLToPath(
					new URL(`../../../../packages/radiant-themes/src/tokens/components/${theme}.css`, import.meta.url),
				),
				'utf8',
			);
			for (const label of Object.values(fonts)) {
				if (!SYSTEM_LABELS.has(label)) expect(css, `${theme}: ${label}`).toContain(label);
			}
		}
	});
});
