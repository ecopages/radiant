import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { docsThemeStylesheets } from '@/lib/docs-theme-stylesheets';
import {
	DOCS_DEFAULT_TUNING_STORAGE_KEY,
	DOCS_THEME_STORAGE_KEY,
	DOCS_THEME_STYLESHEETS_GLOBAL,
	DOCS_THEME_STYLESHEET_ATTR,
	docsThemeColorOptions,
	installDocsThemeStylesheets,
} from '@/lib/docs-theme-preview';
import { ThemePalettePicker } from './theme-palette-picker';
import type { ThemePalettePickerElement } from './theme-palette-picker.script';

let appendedThemeLinks: HTMLLinkElement[] = [];
const expectedThemeValues = [
	'rui-default',
	'github',
	'vscode',
	'vercel',
	'material',
	'high-contrast',
	'windows95',
	'macos-classic',
	'macos',
];

function captureThemeStylesheets(): void {
	appendedThemeLinks = [];
	vi.spyOn(document.head, 'append').mockImplementation((...nodes: (Node | string)[]) => {
		for (const node of nodes) {
			if (node instanceof HTMLLinkElement) appendedThemeLinks.push(node);
		}
	});
}

async function createPicker(): Promise<ThemePalettePickerElement> {
	const markup = withRadiantServerCustomElementRenderBridge(() => renderToString(ThemePalettePicker({})));
	const container = document.createElement('div');
	container.innerHTML = markup;
	const element = container.querySelector('radiant-theme-palette-picker') as ThemePalettePickerElement | null;
	if (!element) throw new Error('The rendered theme picker custom element is missing');
	document.body.append(element);
	await Promise.resolve();
	return element;
}

function chooseTheme(element: ThemePalettePickerElement, value: string): void {
	const input = element.querySelector<HTMLInputElement>(`input[data-token="colors"][value="${value}"]`);
	if (!input) throw new Error(`Theme option ${value} was not rendered`);
	input.checked = true;
	input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

function resetPreview(): void {
	document.body.innerHTML = '';
	localStorage.removeItem(DOCS_THEME_STORAGE_KEY);
	localStorage.removeItem(DOCS_DEFAULT_TUNING_STORAGE_KEY);
	const root = document.documentElement;
	root.classList.remove('dark');
	delete root.dataset.ruiTheme;
	delete root.dataset.ruiTypography;
	for (const property of [
		'--rui-primary',
		'--rui-secondary',
		'--rui-neutral',
		'--rui-density',
		'--rui-radius-scale',
		'--rui-border-alpha',
	]) {
		root.style.removeProperty(property);
	}
	document.querySelectorAll(`link[${DOCS_THEME_STYLESHEET_ATTR}]`).forEach((node) => node.remove());
	delete (globalThis as typeof globalThis & { [DOCS_THEME_STYLESHEETS_GLOBAL]?: unknown })[
		DOCS_THEME_STYLESHEETS_GLOBAL
	];
}

describe('ThemePalettePickerElement', () => {
	beforeEach(() => {
		captureThemeStylesheets();
		resetPreview();
		installDocsThemeStylesheets(docsThemeStylesheets);
	});

	afterEach(() => {
		resetPreview();
		vi.restoreAllMocks();
	});

	it('renders Radiant Default and every optional Radiant Theme from the production component', async () => {
		const element = await createPicker();
		expect(element.querySelector('summary')?.getAttribute('aria-label')).toBe('Choose a color theme');
		expect(element.querySelector('legend')?.textContent).toBe('Documentation theme');
		expect(element.querySelectorAll('input[type="radio"][data-token="colors"]')).toHaveLength(
			docsThemeColorOptions.length,
		);
		expect(
			Array.from(element.querySelectorAll<HTMLInputElement>('input[data-token="colors"]')).map(
				({ value }) => value,
			),
		).toEqual(expectedThemeValues);
	});

	it('applies the selected stylesheet, closes the menu, and returns to Radiant Default', async () => {
		const element = await createPicker();
		const details = element.querySelector('details');
		if (!details) throw new Error('The rendered theme menu is missing');
		details.open = true;
		chooseTheme(element, 'github');

		expect(document.documentElement.dataset.ruiTheme).toBe('github');
		expect(element.querySelector<HTMLInputElement>('input[value="github"]')?.checked).toBe(true);
		expect(details.open).toBe(false);
		expect(
			appendedThemeLinks
				.find((link) => link.getAttribute(DOCS_THEME_STYLESHEET_ATTR) === 'github')
				?.getAttribute('href'),
		).toBe('/assets/themes/github.css');

		chooseTheme(element, 'windows95');
		expect(document.documentElement.dataset.ruiTheme).toBe('windows95');
		expect(
			appendedThemeLinks
				.find((link) => link.getAttribute(DOCS_THEME_STYLESHEET_ATTR) === 'windows95')
				?.getAttribute('href'),
		).toBe('/assets/themes/windows95.css');

		chooseTheme(element, 'rui-default');
		expect(document.documentElement.dataset.ruiTheme).toBe('rui-default');
		expect(document.head.querySelector(`link[${DOCS_THEME_STYLESHEET_ATTR}]`)).toBeNull();
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toContain('264');
		expect(JSON.parse(localStorage.getItem(DOCS_THEME_STORAGE_KEY) ?? '')).toEqual({ colors: 'rui-default' });
	});
});
