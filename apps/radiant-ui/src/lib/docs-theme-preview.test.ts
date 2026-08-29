import { afterEach, describe, expect, it } from 'vitest';
import { readDocsTokenPackCss } from './docs-token-pack-css';
import {
	DOCS_THEME_STORAGE_KEY,
	DOCS_TOKEN_PACK_GLOBAL,
	DOCS_TOKEN_SHEET_ATTR,
	applyDocumentTokens,
	createDocsThemeBootScript,
	defaultDocsThemeSelection,
	installDocsTokenPackCss,
	parseDocsThemeSelection,
	readDocsThemeSelection,
	updateDocsThemeSelection,
} from './docs-theme-preview';

function clearTokenSheets(): void {
	document.querySelectorAll(`style[${DOCS_TOKEN_SHEET_ATTR}]`).forEach((node) => node.remove());
}

describe('docs-theme-preview', () => {
	afterEach(() => {
		localStorage.removeItem(DOCS_THEME_STORAGE_KEY);
		clearTokenSheets();
		delete (globalThis as typeof globalThis & { [DOCS_TOKEN_PACK_GLOBAL]?: unknown })[DOCS_TOKEN_PACK_GLOBAL];
		const root = document.documentElement;
		delete root.dataset.ruiColors;
		delete root.dataset.ruiSpacing;
		delete root.dataset.ruiRadius;
	});

	it('falls back to glacier defaults for missing or invalid payloads', () => {
		expect(parseDocsThemeSelection(null)).toEqual(defaultDocsThemeSelection);
		expect(parseDocsThemeSelection('{not json')).toEqual(defaultDocsThemeSelection);
		expect(parseDocsThemeSelection({ colors: 'mauve', spacing: 'compact' })).toEqual({
			...defaultDocsThemeSelection,
			spacing: 'compact',
		});
	});

	it('applies colour, spacing, and radius to the document and storage', () => {
		applyDocumentTokens({ colors: 'aurora', spacing: 'compact', radius: 'soft' });

		expect(document.documentElement.dataset.ruiColors).toBe('aurora');
		expect(document.documentElement.dataset.ruiSpacing).toBe('compact');
		expect(document.documentElement.dataset.ruiRadius).toBe('soft');
		expect(JSON.parse(localStorage.getItem(DOCS_THEME_STORAGE_KEY) ?? '')).toEqual({
			colors: 'aurora',
			spacing: 'compact',
			radius: 'soft',
		});
	});

	it('injects published spacing and radius pack stylesheets', () => {
		const packs = readDocsTokenPackCss();
		installDocsTokenPackCss(packs);
		applyDocumentTokens({ colors: 'glacier', spacing: 'compact', radius: 'sharp' });

		const spacingSheet = document.head.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="spacing"]`);
		const radiusSheet = document.head.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="radius"]`);
		expect(spacingSheet?.textContent).toBe(packs.spacing.compact);
		expect(radiusSheet?.textContent).toBe(packs.radius.sharp);
		expect(packs.spacing.compact).toContain('--space-1: 0.125rem');
		expect(packs.spacing.compact).not.toMatch(/@import/);
		expect(packs.radius.sharp).toContain('--radius-control: 0');
		expect(packs.radius.sharp).not.toMatch(/@import/);
	});

	it('removes pack stylesheets when returning to the foundation defaults', () => {
		installDocsTokenPackCss(readDocsTokenPackCss());
		applyDocumentTokens({ colors: 'glacier', spacing: 'wide', radius: 'soft' });
		applyDocumentTokens(defaultDocsThemeSelection);

		expect(document.head.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="spacing"]`)).toBeNull();
		expect(document.head.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="radius"]`)).toBeNull();
	});

	it('embeds published pack CSS in the HTML boot script', () => {
		const packs = readDocsTokenPackCss();
		const script = createDocsThemeBootScript(packs);
		expect(script).toContain('--space-1: 0.125rem');
		expect(script).toContain(DOCS_TOKEN_PACK_GLOBAL);
		expect(script).toContain(DOCS_TOKEN_SHEET_ATTR);
	});

	it('updates one token and rejects unknown values', () => {
		expect(updateDocsThemeSelection(defaultDocsThemeSelection, 'colors', 'aurora')).toEqual({
			...defaultDocsThemeSelection,
			colors: 'aurora',
		});
		expect(updateDocsThemeSelection(defaultDocsThemeSelection, 'colors', 'mauve')).toEqual(
			defaultDocsThemeSelection,
		);
	});

	it('reads document attrs before storage', () => {
		localStorage.setItem(
			DOCS_THEME_STORAGE_KEY,
			JSON.stringify({ colors: 'ember', spacing: 'wide', radius: 'sharp' }),
		);
		document.documentElement.dataset.ruiColors = 'basalt';
		document.documentElement.dataset.ruiSpacing = 'compact';
		document.documentElement.dataset.ruiRadius = 'soft';

		expect(readDocsThemeSelection()).toEqual({
			colors: 'basalt',
			spacing: 'compact',
			radius: 'soft',
		});
	});
});
