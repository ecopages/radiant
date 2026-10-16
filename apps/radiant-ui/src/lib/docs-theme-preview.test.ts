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
		localStorage.removeItem('theme');
		clearTokenSheets();
		delete (globalThis as typeof globalThis & { [DOCS_TOKEN_PACK_GLOBAL]?: unknown })[DOCS_TOKEN_PACK_GLOBAL];
		const root = document.documentElement;
		delete root.dataset.ruiTheme;
		delete root.dataset.ruiSpacing;
		delete root.dataset.ruiRadius;
	});

	it('falls back to Basalt defaults for missing or invalid payloads', () => {
		expect(parseDocsThemeSelection(null)).toEqual(defaultDocsThemeSelection);
		expect(parseDocsThemeSelection('{not json')).toEqual(defaultDocsThemeSelection);
		expect(parseDocsThemeSelection({ colors: 'mauve', spacing: 'compact' })).toEqual({
			...defaultDocsThemeSelection,
			spacing: 'compact',
		});
	});

	it('applies colour, spacing, and radius to the document and storage', () => {
		applyDocumentTokens({ colors: 'github', spacing: 'compact', radius: 'default' });

		expect(document.documentElement.dataset.ruiTheme).toBe('github');
		expect(document.documentElement.dataset.ruiSpacing).toBe('compact');
		expect(document.documentElement.dataset.ruiRadius).toBe('default');
		expect(JSON.parse(localStorage.getItem(DOCS_THEME_STORAGE_KEY) ?? '')).toEqual({
			colors: 'github',
			spacing: 'compact',
			radius: 'default',
		});
	});

	it('injects published spacing and radius pack stylesheets', () => {
		const packs = readDocsTokenPackCss();
		installDocsTokenPackCss(packs);
		applyDocumentTokens({ colors: 'github', spacing: 'compact', radius: 'sharp' });

		const spacingSheet = document.documentElement.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="spacing"]`);
		const radiusSheet = document.documentElement.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="radius"]`);
		expect(spacingSheet?.textContent).toBe(packs.spacing.compact);
		expect(radiusSheet?.textContent).toBe(packs.radius.sharp);
		expect(packs.themes.github).toContain('--color-github-canvas: #ffffff');
		expect(packs.themes.github).not.toMatch(/@import/);
		expect(packs.spacing.compact).toContain('--space-1: calc(0.125rem * var(--rui-density))');
		expect(packs.spacing.compact).not.toMatch(/@import/);
		expect(packs.radius.sharp).toContain('--radius-control: 0');
		expect(packs.radius.sharp).not.toMatch(/@import/);
	});

	it('removes pack stylesheets when returning to the foundation defaults', () => {
		installDocsTokenPackCss(readDocsTokenPackCss());
		applyDocumentTokens({ colors: 'github', spacing: 'wide', radius: 'sharp' });
		applyDocumentTokens(defaultDocsThemeSelection);

		expect(document.documentElement.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="theme"]`)).toBeNull();
		expect(document.documentElement.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="spacing"]`)).toBeNull();
		expect(document.documentElement.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="radius"]`)).toBeNull();
	});

	it('embeds published pack CSS in the HTML boot script', () => {
		const packs = readDocsTokenPackCss();
		const script = createDocsThemeBootScript(packs);
		expect(script).toContain('--space-1: calc(0.125rem * var(--rui-density))');
		expect(script).toContain(DOCS_TOKEN_PACK_GLOBAL);
		expect(script).toContain(DOCS_TOKEN_SHEET_ATTR);
	});

	it('applies stored theme preferences before the page paints', () => {
		const packs = readDocsTokenPackCss();
		localStorage.setItem('theme', 'dark');
		localStorage.setItem(
			DOCS_THEME_STORAGE_KEY,
			JSON.stringify({ colors: 'github', spacing: 'compact', radius: 'sharp' }),
		);

		new Function(createDocsThemeBootScript(packs))();

		const root = document.documentElement;
		expect(root.dataset.ruiTheme).toBe('github');
		expect(root.dataset.ruiSpacing).toBe('compact');
		expect(root.dataset.ruiRadius).toBe('sharp');
		expect(root.getAttribute('data-theme')).toBe('dark');
		expect(root.classList.contains('dark')).toBe(true);
		expect(root.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="theme"]`)?.textContent).toBe(packs.themes.github);
		expect(root.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="spacing"]`)?.textContent).toBe(
			packs.spacing.compact,
		);
		expect(root.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="radius"]`)?.textContent).toBe(packs.radius.sharp);
		expect(
			(globalThis as typeof globalThis & { [DOCS_TOKEN_PACK_GLOBAL]?: unknown })[DOCS_TOKEN_PACK_GLOBAL],
		).toEqual(packs);
	});

	it('updates one token and rejects unknown values', () => {
		expect(updateDocsThemeSelection(defaultDocsThemeSelection, 'colors', 'vscode')).toEqual({
			...defaultDocsThemeSelection,
			colors: 'vscode',
		});
		expect(updateDocsThemeSelection(defaultDocsThemeSelection, 'colors', 'mauve')).toEqual(
			defaultDocsThemeSelection,
		);
	});

	it('reads document attrs before storage', () => {
		localStorage.setItem(
			DOCS_THEME_STORAGE_KEY,
			JSON.stringify({ colors: 'vercel', spacing: 'wide', radius: 'sharp' }),
		);
		document.documentElement.dataset.ruiTheme = 'github';
		document.documentElement.dataset.ruiSpacing = 'compact';
		document.documentElement.dataset.ruiRadius = 'sharp';

		expect(readDocsThemeSelection()).toEqual({
			colors: 'github',
			spacing: 'compact',
			radius: 'sharp',
		});
	});
});
