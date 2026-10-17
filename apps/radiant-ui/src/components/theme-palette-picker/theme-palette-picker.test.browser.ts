import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import type { RuiSelectElement } from '@ecopages/radiant-ui/select';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { docsThemeStylesheets } from '@/lib/docs-theme-stylesheets';
import {
	DOCS_APPEARANCE_STORAGE_KEY,
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
	'cloudflare',
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
	const select = element.querySelector('rui-select[data-theme-picker]');
	const trigger = select?.querySelector<HTMLElement>('[data-select-trigger]');
	const option = select?.querySelector<HTMLElement>(`[role="option"][data-value="${value}"]`);
	if (!select || !trigger || !option) throw new Error(`Theme option ${value} was not rendered`);
	trigger.click();
	option.click();
}

function resetPreview(): void {
	document.body.innerHTML = '';
	localStorage.removeItem(DOCS_THEME_STORAGE_KEY);
	localStorage.removeItem(DOCS_DEFAULT_TUNING_STORAGE_KEY);
	localStorage.removeItem(DOCS_APPEARANCE_STORAGE_KEY);
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

	it('renders every theme as a Radiant UI select option', async () => {
		const element = await createPicker();
		const select = element.querySelector<RuiSelectElement>('rui-select[data-theme-picker]');
		const trigger = select?.querySelector('[data-select-trigger]');
		expect(trigger?.getAttribute('role')).toBe('combobox');
		expect(trigger?.getAttribute('aria-label')).toBe('Choose a color theme');
		expect(trigger?.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
		expect(select?.querySelector('[role="listbox"]')?.getAttribute('aria-label')).toBe('Choose a color theme');
		expect(select?.querySelectorAll('[role="option"]')).toHaveLength(docsThemeColorOptions.length);
		expect(
			Array.from(element.querySelectorAll<HTMLElement>('[role="option"]')).map((option) => option.dataset.value),
		).toEqual(expectedThemeValues);
		expect(element.querySelectorAll('input[type="radio"], select')).toHaveLength(0);
	});

	it('applies the selected stylesheet through RuiSelect and returns to Radiant Default', async () => {
		const element = await createPicker();
		const select = element.querySelector<RuiSelectElement>('rui-select[data-theme-picker]');
		const popup = select?.querySelector<HTMLElement>('[data-select-listbox]');
		if (!select || !popup) throw new Error('The rendered theme menu is missing');
		chooseTheme(element, 'github');

		expect(document.documentElement.dataset.ruiTheme).toBe('github');
		expect(select.value).toEqual(['github']);
		expect(select.querySelector('[role="option"][data-value="github"]')?.getAttribute('aria-selected')).toBe(
			'true',
		);
		expect(select.querySelector('[data-select-value]')?.textContent?.trim()).toBe('GitHub');
		expect(popup.hidden).toBe(true);
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
		expect(JSON.parse(localStorage.getItem(DOCS_APPEARANCE_STORAGE_KEY) ?? '')).toMatchObject({
			colors: 'rui-default',
		});
	});
});
