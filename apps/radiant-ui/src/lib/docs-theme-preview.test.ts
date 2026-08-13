import { afterEach, describe, expect, it } from 'vitest';
import {
	DOCS_THEME_STORAGE_KEY,
	applyDocumentTokens,
	defaultDocsThemeSelection,
	parseDocsThemeSelection,
	readDocsThemeSelection,
	updateDocsThemeSelection,
} from './docs-theme-preview';

describe('docs-theme-preview', () => {
	afterEach(() => {
		localStorage.removeItem(DOCS_THEME_STORAGE_KEY);
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
