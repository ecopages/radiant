import { afterEach, describe, expect, it, vi } from 'vitest';
import { docsThemeStylesheets } from '@/lib/docs-theme-stylesheets';
import {
	applyDocumentTokens,
	DOCS_THEME_STYLESHEET_ATTR,
	installDocsThemeStylesheets,
	DOCS_THEME_STYLESHEETS_GLOBAL,
} from '@/lib/docs-theme-preview';
import { TokenSwatchesElement } from './token-swatches.script';

describe('TokenSwatchesElement', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = '';
		document.head
			.querySelectorAll(`link[${DOCS_THEME_STYLESHEET_ATTR}], style[data-token-theme-test]`)
			.forEach((node) => {
				node.remove();
			});
		delete document.documentElement.dataset.ruiTheme;
		localStorage.removeItem('radiant-ui-docs:appearance');
		delete (globalThis as typeof globalThis & { [DOCS_THEME_STYLESHEETS_GLOBAL]?: unknown })[
			DOCS_THEME_STYLESHEETS_GLOBAL
		];
	});

	it('refreshes computed token labels after the selected theme stylesheet loads', async () => {
		const baseStyles = document.createElement('style');
		baseStyles.dataset.tokenThemeTest = 'base';
		baseStyles.textContent = ':root { --radius-control: 12px; }';
		document.head.append(baseStyles);
		const windows95Styles = document.createElement('style');
		windows95Styles.dataset.tokenThemeTest = 'windows95';
		windows95Styles.textContent = ':root[data-rui-theme="windows95"] { --radius-control: 0px; }';
		installDocsThemeStylesheets(docsThemeStylesheets);
		const appendedThemeLinks: HTMLLinkElement[] = [];
		const append = document.head.append.bind(document.head);
		vi.spyOn(document.head, 'append').mockImplementation((...nodes: (Node | string)[]) => {
			for (const node of nodes) {
				if (node instanceof HTMLLinkElement && node.hasAttribute(DOCS_THEME_STYLESHEET_ATTR)) {
					appendedThemeLinks.push(node);
				} else {
					append(node);
				}
			}
		});

		const swatches = document.createElement('radiant-token-swatches') as TokenSwatchesElement;
		swatches.innerHTML = '<span data-token-value="--radius-control"></span>';
		document.body.append(swatches);
		await Promise.resolve();
		expect(swatches.querySelector('[data-token-value]')?.textContent).toBe('12px');

		applyDocumentTokens({ colors: 'windows95' }, { persist: false });
		await Promise.resolve();
		expect(swatches.querySelector('[data-token-value]')?.textContent).toBe('12px');
		if (document.readyState === 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
		const themeStylesheet = appendedThemeLinks[0];
		if (!themeStylesheet) throw new Error('The selected theme stylesheet was not appended');

		document.head.append(windows95Styles);
		themeStylesheet.dispatchEvent(new Event('load'));

		expect(swatches.querySelector('[data-token-value]')?.textContent).toBe('0px');
	});
});
