import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { docsThemeStylesheets } from './docs-theme-stylesheets';
import {
	applyDefaultThemeTuning,
	applyDocumentTokens,
	clearDefaultThemeTuning,
	createDocsDefaultThemeTuningCss,
	createDocsThemeBootScript,
	defaultDocsThemeSelection,
	DOCS_DEFAULT_THEME_TUNING,
	DOCS_DEFAULT_TUNING_STORAGE_KEY,
	DOCS_THEME_STORAGE_KEY,
	DOCS_THEME_STYLESHEETS_GLOBAL,
	DOCS_THEME_STYLESHEET_ATTR,
	installDocsThemeStylesheets,
	parseDocsDefaultThemeTuning,
	readDocsThemeSelection,
	updateDocsThemeSelection,
} from './docs-theme-preview';

let appendedThemeLinks: HTMLLinkElement[] = [];
let activeThemeLinks = new Set<HTMLLinkElement>();

function captureThemeStylesheets(): void {
	appendedThemeLinks = [];
	activeThemeLinks = new Set();
	const themeSelector = `link[${DOCS_THEME_STYLESHEET_ATTR}]`;
	const querySelector = document.head.querySelector.bind(document.head);
	const querySelectorAll = document.head.querySelectorAll.bind(document.head);
	vi.spyOn(document.head, 'querySelector').mockImplementation((selector) => {
		if (selector === themeSelector) return [...activeThemeLinks][0] ?? null;
		return querySelector(selector);
	});
	vi.spyOn(document.head, 'querySelectorAll').mockImplementation((selector) => {
		if (selector === themeSelector) return [...activeThemeLinks] as unknown as NodeListOf<Element>;
		return querySelectorAll(selector);
	});
	vi.spyOn(document.head, 'append').mockImplementation((...nodes: (Node | string)[]) => {
		for (const node of nodes) {
			if (!(node instanceof HTMLLinkElement)) continue;
			appendedThemeLinks.push(node);
			activeThemeLinks.add(node);
			vi.spyOn(node, 'remove').mockImplementation(() => {
				activeThemeLinks.delete(node);
			});
		}
	});
}

function clearThemeStylesheets(): void {
	document.querySelectorAll(`link[${DOCS_THEME_STYLESHEET_ATTR}]`).forEach((node) => node.remove());
}

function clearTuning(): void {
	clearDefaultThemeTuning(document.documentElement);
	localStorage.removeItem(DOCS_DEFAULT_TUNING_STORAGE_KEY);
}

describe('docs-theme-preview', () => {
	beforeEach(() => {
		captureThemeStylesheets();
	});

	afterEach(() => {
		localStorage.removeItem(DOCS_THEME_STORAGE_KEY);
		localStorage.removeItem('theme');
		clearThemeStylesheets();
		clearTuning();
		delete (globalThis as typeof globalThis & { [DOCS_THEME_STYLESHEETS_GLOBAL]?: unknown })[
			DOCS_THEME_STYLESHEETS_GLOBAL
		];
		vi.restoreAllMocks();
		const root = document.documentElement;
		delete root.dataset.ruiTheme;
		delete root.dataset.ruiTypography;
		root.style.removeProperty('--font-sans');
		root.style.removeProperty('--font-heading');
		root.style.removeProperty('--font-mono');
	});

	it('falls back to Radiant Default for missing or invalid stored theme state', () => {
		expect(defaultDocsThemeSelection).toEqual({ colors: 'rui-default' });
		expect(readDocsThemeSelection()).toEqual(defaultDocsThemeSelection);
		expect(updateDocsThemeSelection(defaultDocsThemeSelection, 'colors', 'unknown')).toEqual(
			defaultDocsThemeSelection,
		);
	});

	it('loads an optional theme from its cacheable stylesheet and stores the selection', () => {
		installDocsThemeStylesheets(docsThemeStylesheets);
		applyDocumentTokens({ colors: 'github' });

		expect(document.documentElement.dataset.ruiTheme).toBe('github');
		expect(document.documentElement.style.getPropertyValue('--font-sans')).toBe('');
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('');
		expect(
			appendedThemeLinks
				.find((link) => link.getAttribute(DOCS_THEME_STYLESHEET_ATTR) === 'github')
				?.getAttribute('href'),
		).toBe('/assets/themes/github.css');
		expect(JSON.parse(localStorage.getItem(DOCS_THEME_STORAGE_KEY) ?? '')).toEqual({ colors: 'github' });
	});

	it('keeps the old theme until the new stylesheet loads and ignores stale responses', () => {
		installDocsThemeStylesheets(docsThemeStylesheets);
		applyDocumentTokens({ colors: 'github' });
		const githubLink = appendedThemeLinks[0];
		applyDocumentTokens({ colors: 'vscode' });
		applyDocumentTokens({ colors: 'vscode' });
		const vscodeLink = appendedThemeLinks[1];

		expect(activeThemeLinks.size).toBe(2);
		vscodeLink.dispatchEvent(new Event('load'));
		githubLink.dispatchEvent(new Event('load'));

		expect([...activeThemeLinks]).toEqual([vscodeLink]);
		expect(document.documentElement.dataset.ruiTheme).toBe('vscode');
	});

	it('falls back to the default theme and restores tuning when an optional stylesheet fails', () => {
		installDocsThemeStylesheets(docsThemeStylesheets);
		const tuning = { ...DOCS_DEFAULT_THEME_TUNING, primaryHue: 310 };
		localStorage.setItem(DOCS_DEFAULT_TUNING_STORAGE_KEY, JSON.stringify(tuning));
		applyDefaultThemeTuning(document.documentElement, tuning);
		applyDocumentTokens({ colors: 'material' });
		appendedThemeLinks[0].dispatchEvent(new Event('error'));

		expect(activeThemeLinks.size).toBe(0);
		expect(document.documentElement.dataset.ruiTheme).toBe('rui-default');
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('oklch(52% 0.19 310)');
		expect(JSON.parse(localStorage.getItem(DOCS_THEME_STORAGE_KEY) ?? '')).toEqual({ colors: 'rui-default' });
	});

	it('keeps typography inside the selected theme and clears stale preview overrides', () => {
		installDocsThemeStylesheets(docsThemeStylesheets);
		document.documentElement.dataset.ruiTypography = 'editorial';
		document.documentElement.style.setProperty('--font-heading', 'Georgia, serif');
		applyDocumentTokens({ colors: 'material' });
		expect(document.documentElement.dataset.ruiTypography).toBeUndefined();
		expect(document.documentElement.style.getPropertyValue('--font-heading')).toBe('');
		expect(
			appendedThemeLinks
				.find((link) => link.getAttribute(DOCS_THEME_STYLESHEET_ATTR) === 'material')
				?.getAttribute('href'),
		).toBe('/assets/themes/material.css');
	});

	it('publishes cacheable stylesheet URLs for all optional themes', () => {
		for (const [name, href] of Object.entries(docsThemeStylesheets.themes)) {
			expect(href, `${name} is available`).toBe(`/assets/themes/${name}.css`);
		}
	});

	it('removes optional stylesheet links and default-only overrides on return to Radiant Default', () => {
		installDocsThemeStylesheets(docsThemeStylesheets);
		applyDocumentTokens({ colors: 'github' });
		applyDefaultThemeTuning(document.documentElement, { ...DOCS_DEFAULT_THEME_TUNING, primaryHue: 110 });
		applyDocumentTokens(defaultDocsThemeSelection);

		expect(document.querySelector(`link[${DOCS_THEME_STYLESHEET_ATTR}]`)).toBeNull();
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('oklch(52% 0.19 264)');
	});

	it('parses and bounds the six default theme inputs', () => {
		expect(parseDocsDefaultThemeTuning('{invalid')).toEqual(DOCS_DEFAULT_THEME_TUNING);
		expect(parseDocsDefaultThemeTuning({ primaryHue: 400, density: 0.4, borderAlpha: 120 })).toEqual({
			...DOCS_DEFAULT_THEME_TUNING,
			primaryHue: 360,
			density: 0.85,
			borderAlpha: 100,
		});
		const tuning = { ...DOCS_DEFAULT_THEME_TUNING, primaryHue: 280, borderAlpha: 56 };
		expect(createDocsDefaultThemeTuningCss(tuning)).toContain('--rui-primary: oklch(52% 0.19 280)');
		expect(createDocsDefaultThemeTuningCss(tuning)).toContain('--rui-border-alpha: 56%');
		expect(createDocsDefaultThemeTuningCss({ ...tuning, borderAlpha: 100 })).toContain('--rui-border-alpha: 100%');
	});

	it('applies stored theme and tuning preferences in a compact boot script', () => {
		localStorage.setItem('theme', 'dark');
		localStorage.setItem(DOCS_THEME_STORAGE_KEY, JSON.stringify({ colors: 'material' }));
		localStorage.setItem(DOCS_DEFAULT_TUNING_STORAGE_KEY, JSON.stringify({ primaryHue: 300 }));
		const script = createDocsThemeBootScript(docsThemeStylesheets);

		new Function(script)();

		const root = document.documentElement;
		expect(root.dataset.ruiTheme).toBe('material');
		expect(root.dataset.ruiTypography).toBeUndefined();
		expect(root.style.getPropertyValue('--rui-primary')).toBe('');
		expect(root.getAttribute('data-theme')).toBe('dark');
		expect(root.classList.contains('dark')).toBe(true);
		expect(
			appendedThemeLinks
				.find((link) => link.getAttribute(DOCS_THEME_STYLESHEET_ATTR) === 'material')
				?.getAttribute('href'),
		).toBe('/assets/themes/material.css');
		expect(
			(globalThis as typeof globalThis & { [DOCS_THEME_STYLESHEETS_GLOBAL]?: unknown })[
				DOCS_THEME_STYLESHEETS_GLOBAL
			],
		).toEqual(docsThemeStylesheets);
		expect(script.length).toBeLessThan(8_000);
	});

	it('keeps booting when an invalid tuning preference is stored', () => {
		localStorage.setItem(DOCS_THEME_STORAGE_KEY, JSON.stringify({ colors: 'material' }));
		localStorage.setItem(DOCS_DEFAULT_TUNING_STORAGE_KEY, '{invalid');
		new Function(createDocsThemeBootScript(docsThemeStylesheets))();
		expect(document.documentElement.dataset.ruiTheme).toBe('material');
	});

	it('falls back to Radiant Default when the boot stylesheet fails', () => {
		localStorage.setItem(DOCS_THEME_STORAGE_KEY, JSON.stringify({ colors: 'material' }));
		localStorage.setItem(DOCS_DEFAULT_TUNING_STORAGE_KEY, JSON.stringify({ primaryHue: 310 }));
		new Function(createDocsThemeBootScript(docsThemeStylesheets))();
		appendedThemeLinks[0].dispatchEvent(new Event('error'));

		expect(document.documentElement.dataset.ruiTheme).toBe('rui-default');
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('oklch(52% 0.19 310)');
		expect(JSON.parse(localStorage.getItem(DOCS_THEME_STORAGE_KEY) ?? '')).toEqual({ colors: 'rui-default' });
	});

	it('reads live document attributes ahead of stored preferences', () => {
		localStorage.setItem(DOCS_THEME_STORAGE_KEY, JSON.stringify({ colors: 'github', typography: 'editorial' }));
		document.documentElement.dataset.ruiTheme = 'vscode';
		expect(readDocsThemeSelection()).toEqual({ colors: 'vscode' });
	});
});
