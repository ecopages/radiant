import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { docsThemeStylesheets } from './docs-theme-stylesheets';
import {
	DOCS_APPEARANCE_STORAGE_KEY,
	DOCS_APPEARANCE_VERSION,
	applyDefaultThemeTuning,
	applyDocumentTokens,
	clearDefaultThemeTuning,
	createDocsDefaultThemeTuningCss,
	createDocsThemeBootScript,
	defaultDocsThemeSelection,
	DOCS_DEFAULT_THEME_TUNING,
	DOCS_THEME_STORAGE_KEY,
	DOCS_THEME_QUERY_KEY,
	DOCS_MODE_QUERY_KEY,
	DOCS_THEME_BOOT_PENDING_GLOBAL,
	DOCS_THEME_STYLESHEETS_GLOBAL,
	DOCS_THEME_STYLESHEET_ATTR,
	installDocsThemeStylesheets,
	parseDocsDefaultThemeTuning,
	readDocsThemeSelection,
	readDocsDefaultThemeTuning,
	readDocsThemeMode,
	writeDocsDefaultThemeTuning,
	writeDocsThemeMode,
	updateDocsThemeSelection,
} from './docs-theme-preview';

let appendedThemeLinks: HTMLLinkElement[] = [];
let appendedHeadNodes: (Node | string)[] = [];
let activeThemeLinks = new Set<HTMLLinkElement>();

function captureThemeStylesheets(): void {
	appendedThemeLinks = [];
	appendedHeadNodes = [];
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
		appendedHeadNodes.push(...nodes);
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
	localStorage.removeItem(DOCS_APPEARANCE_STORAGE_KEY);
}

function runBootScript(): string {
	const script = createDocsThemeBootScript(docsThemeStylesheets);
	new Function(script)();
	if (document.readyState === 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
	return script;
}

describe('docs-theme-preview', () => {
	beforeEach(() => {
		captureThemeStylesheets();
	});

	afterEach(() => {
		localStorage.removeItem(DOCS_THEME_STORAGE_KEY);
		localStorage.removeItem(DOCS_APPEARANCE_STORAGE_KEY);
		localStorage.removeItem('theme');
		history.replaceState(history.state, '', '/');
		clearThemeStylesheets();
		document.head.querySelector('link[href="/assets/styles/tailwind.css"]')?.remove();
		clearTuning();
		delete (globalThis as typeof globalThis & { [DOCS_THEME_STYLESHEETS_GLOBAL]?: unknown })[
			DOCS_THEME_STYLESHEETS_GLOBAL
		];
		delete (globalThis as typeof globalThis & { [DOCS_THEME_BOOT_PENDING_GLOBAL]?: boolean })[
			DOCS_THEME_BOOT_PENDING_GLOBAL
		];
		vi.restoreAllMocks();
		const root = document.documentElement;
		delete root.dataset.ruiTheme;
		root.style.removeProperty('visibility');
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
		expect(JSON.parse(localStorage.getItem(DOCS_APPEARANCE_STORAGE_KEY) ?? '')).toMatchObject({ colors: 'github' });
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
		localStorage.setItem(
			DOCS_APPEARANCE_STORAGE_KEY,
			JSON.stringify({ v: DOCS_APPEARANCE_VERSION, colors: 'rui-default', tuning: { primaryHue: 310 } }),
		);
		document.documentElement.dataset.ruiTheme = 'rui-default';
		applyDefaultThemeTuning(document.documentElement, tuning);
		applyDocumentTokens({ colors: 'material' });
		appendedThemeLinks[0].dispatchEvent(new Event('error'));

		expect(activeThemeLinks.size).toBe(0);
		expect(document.documentElement.dataset.ruiTheme).toBe('rui-default');
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('oklch(52% 0.19 264)');
	});

	it('loads the selected theme stylesheet when tokens are applied', () => {
		installDocsThemeStylesheets(docsThemeStylesheets);
		applyDocumentTokens({ colors: 'material' });
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
		localStorage.setItem(
			DOCS_APPEARANCE_STORAGE_KEY,
			JSON.stringify({ colors: 'material', tuning: { ...DOCS_DEFAULT_THEME_TUNING, primaryHue: 300 } }),
		);
		const script = runBootScript();

		const root = document.documentElement;
		expect(root.dataset.ruiTheme).toBe('material');
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
		localStorage.setItem(DOCS_APPEARANCE_STORAGE_KEY, JSON.stringify({ colors: 'material', tuning: '{invalid' }));
		runBootScript();
		expect(document.documentElement.dataset.ruiTheme).toBe('material');
	});

	it('applies the URL theme when storage reads throw', () => {
		const getItem = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
			throw new DOMException('Blocked', 'SecurityError');
		});
		history.replaceState(history.state, '', `/?${DOCS_THEME_QUERY_KEY}=github`);
		runBootScript();
		getItem.mockRestore();

		expect(document.documentElement.dataset.ruiTheme).toBe('github');
		expect(appendedThemeLinks[0]?.getAttribute(DOCS_THEME_STYLESHEET_ATTR)).toBe('github');
	});

	it('falls back to Radiant Default when the boot stylesheet fails', () => {
		localStorage.setItem(
			DOCS_APPEARANCE_STORAGE_KEY,
			JSON.stringify({ v: DOCS_APPEARANCE_VERSION, colors: 'material', tuning: { primaryHue: 310 } }),
		);
		runBootScript();
		appendedThemeLinks[0].dispatchEvent(new Event('error'));

		expect(document.documentElement.dataset.ruiTheme).toBe('rui-default');
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('oklch(52% 0.19 310)');
		expect(JSON.parse(localStorage.getItem(DOCS_APPEARANCE_STORAGE_KEY) ?? '')).toMatchObject({
			colors: 'rui-default',
		});
	});

	it('reads live document attributes ahead of stored preferences', () => {
		localStorage.setItem(
			DOCS_APPEARANCE_STORAGE_KEY,
			JSON.stringify({ colors: 'github', typography: 'editorial' }),
		);
		document.documentElement.dataset.ruiTheme = 'vscode';
		expect(readDocsThemeSelection()).toEqual({ colors: 'vscode' });
	});

	it('lets shareable URL state override saved appearance and preserves unrelated query state', () => {
		localStorage.setItem('theme', 'light');
		localStorage.setItem(
			DOCS_APPEARANCE_STORAGE_KEY,
			JSON.stringify({ v: DOCS_APPEARANCE_VERSION, colors: 'github', tuning: { primaryHue: 285, density: 1.1 } }),
		);
		history.replaceState(
			history.state,
			'',
			`/docs/tabs?keep=1&${DOCS_THEME_QUERY_KEY}=cloudflare&${DOCS_MODE_QUERY_KEY}=dark&rui-primary-hue=310#examples`,
		);

		expect(readDocsThemeSelection()).toEqual({ colors: 'cloudflare' });
		expect(readDocsThemeMode()).toBe('dark');
		expect(readDocsDefaultThemeTuning()).toEqual({
			...DOCS_DEFAULT_THEME_TUNING,
			primaryHue: 310,
			density: 1.1,
		});

		writeDocsThemeMode('light');
		writeDocsDefaultThemeTuning(DOCS_DEFAULT_THEME_TUNING);

		const url = new URL(window.location.href);
		expect(url.searchParams.get('keep')).toBe('1');
		expect(url.searchParams.get(DOCS_THEME_QUERY_KEY)).toBe('cloudflare');
		expect(url.searchParams.get(DOCS_MODE_QUERY_KEY)).toBe('light');
		expect(url.searchParams.has('rui-primary-hue')).toBe(false);
		expect(url.hash).toBe('#examples');
		expect(localStorage.getItem(DOCS_THEME_STORAGE_KEY)).toBeNull();
	});

	it('applies URL appearance overrides in the generated reload boot script', () => {
		localStorage.setItem('theme', 'light');
		localStorage.setItem(
			DOCS_APPEARANCE_STORAGE_KEY,
			JSON.stringify({
				colors: 'github',
				tuning: { ...DOCS_DEFAULT_THEME_TUNING, primaryHue: 285, borderAlpha: 36 },
			}),
		);
		history.replaceState(
			history.state,
			'',
			`/docs/tabs?${DOCS_THEME_QUERY_KEY}=rui-default&${DOCS_MODE_QUERY_KEY}=dark&rui-primary-hue=310&rui-border-alpha=80`,
		);

		runBootScript();

		expect(document.documentElement.dataset.ruiTheme).toBe('rui-default');
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('oklch(52% 0.19 310)');
		expect(document.documentElement.style.getPropertyValue('--rui-border-alpha')).toBe('80%');
		expect(appendedThemeLinks).toHaveLength(0);
	});

	it('keeps shared tuning overrides out of first-visit stored preferences', () => {
		localStorage.setItem(DOCS_THEME_STORAGE_KEY, JSON.stringify({ colors: 'github' }));
		history.replaceState(
			history.state,
			'',
			`/docs/tabs?${DOCS_THEME_QUERY_KEY}=rui-default&rui-primary-hue=310&rui-border-alpha=80`,
		);

		runBootScript();

		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('oklch(52% 0.19 310)');
		expect(document.documentElement.style.getPropertyValue('--rui-border-alpha')).toBe('80%');
		expect(JSON.parse(localStorage.getItem(DOCS_APPEARANCE_STORAGE_KEY) ?? '')).toEqual({
			v: DOCS_APPEARANCE_VERSION,
			colors: 'github',
			tuning: {},
		});
	});

	it('persists only the tuning values a visitor changed', () => {
		writeDocsDefaultThemeTuning({ ...DOCS_DEFAULT_THEME_TUNING, primaryHue: 300 });
		expect(JSON.parse(localStorage.getItem(DOCS_APPEARANCE_STORAGE_KEY) ?? '')).toEqual({
			v: DOCS_APPEARANCE_VERSION,
			colors: 'rui-default',
			tuning: { primaryHue: 300 },
		});

		writeDocsDefaultThemeTuning(DOCS_DEFAULT_THEME_TUNING);
		expect(JSON.parse(localStorage.getItem(DOCS_APPEARANCE_STORAGE_KEY) ?? '').tuning).toEqual({});
	});

	it('ignores tuning saved before only changed values were persisted', () => {
		localStorage.setItem(
			DOCS_APPEARANCE_STORAGE_KEY,
			JSON.stringify({ colors: 'rui-default', tuning: { ...DOCS_DEFAULT_THEME_TUNING, borderAlpha: 48 } }),
		);

		expect(readDocsDefaultThemeTuning().borderAlpha).toBe(DOCS_DEFAULT_THEME_TUNING.borderAlpha);
		runBootScript();
		expect(document.documentElement.style.getPropertyValue('--rui-border-alpha')).toBe(
			`${DOCS_DEFAULT_THEME_TUNING.borderAlpha}%`,
		);
	});

	it('resets Radiant Default tuning when another theme is chosen', () => {
		installDocsThemeStylesheets(docsThemeStylesheets);
		document.documentElement.dataset.ruiTheme = 'rui-default';
		writeDocsDefaultThemeTuning({ ...DOCS_DEFAULT_THEME_TUNING, primaryHue: 300, borderAlpha: 60 });
		expect(new URLSearchParams(window.location.search).get('rui-primary-hue')).toBe('300');

		applyDocumentTokens({ colors: 'github' });
		expect(JSON.parse(localStorage.getItem(DOCS_APPEARANCE_STORAGE_KEY) ?? '')).toEqual({
			v: DOCS_APPEARANCE_VERSION,
			colors: 'github',
			tuning: {},
		});
		expect(new URLSearchParams(window.location.search).has('rui-primary-hue')).toBe(false);

		applyDocumentTokens({ colors: 'rui-default' });
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('oklch(52% 0.19 264)');
		expect(readDocsDefaultThemeTuning()).toEqual(DOCS_DEFAULT_THEME_TUNING);
	});

	it('waits to append a shared theme until after parsed stylesheets, then reveals the page after load', () => {
		vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
		const baseStylesheet = document.createElement('link');
		baseStylesheet.rel = 'stylesheet';
		baseStylesheet.href = '/assets/styles/tailwind.css';
		appendedHeadNodes.push(baseStylesheet);
		localStorage.setItem(DOCS_APPEARANCE_STORAGE_KEY, JSON.stringify({ colors: 'cloudflare' }));
		new Function(createDocsThemeBootScript(docsThemeStylesheets))();

		expect(appendedThemeLinks).toHaveLength(0);
		expect(document.documentElement.style.getPropertyValue('visibility')).toBe('hidden');

		document.dispatchEvent(new Event('DOMContentLoaded'));
		const themeLink = appendedThemeLinks[0];
		expect(appendedHeadNodes.at(-1)).toBe(themeLink);
		expect(appendedHeadNodes.at(-2)).toBe(baseStylesheet);
		expect(document.documentElement.style.getPropertyValue('visibility')).toBe('hidden');

		themeLink.dispatchEvent(new Event('load'));
		expect(document.documentElement.style.getPropertyValue('visibility')).toBe('');
	});
});
