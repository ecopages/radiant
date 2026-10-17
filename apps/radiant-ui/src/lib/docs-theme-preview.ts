export const DOCS_THEME_STORAGE_KEY = 'radiant-ui-docs:theme';

/** Boot script and `applyDocumentTokens` share theme asset URLs. */
export const DOCS_THEME_STYLESHEETS_GLOBAL = '__RUI_DOCS_THEME_STYLESHEETS';

/** Marks the currently loaded optional theme stylesheet. */
export const DOCS_THEME_STYLESHEET_ATTR = 'data-rui-docs-theme';

export const docsThemeColorOptions = [
	{ value: 'rui-default', label: 'Radiant Default', description: 'Radiant default, cool and quiet' },
	{ value: 'github', label: 'GitHub', description: 'Clean surfaces and clear status colors' },
	{ value: 'vscode', label: 'VS Code', description: 'Editor-inspired light and dark modes' },
	{ value: 'vercel', label: 'Vercel', description: 'Layered monochrome surfaces and clear component states' },
	{
		value: 'material',
		label: 'Material Design',
		description: 'Expressive color, rounded controls, and tonal surfaces',
	},
	{ value: 'high-contrast', label: 'High Contrast', description: 'Black and white surfaces with AAA text contrast' },
	{
		value: 'windows95',
		label: 'Windows 95',
		description: 'Classic raised controls, title bars, and selection states',
	},
	{ value: 'macos-classic', label: 'Mac OS Classic', description: 'Platinum controls and striped title bars' },
	{ value: 'macos', label: 'macOS', description: 'Layered native-inspired surfaces and accent states' },
] as const;

export const docsThemeTokenNames = ['colors'] as const;

export type DocsThemeColor = (typeof docsThemeColorOptions)[number]['value'];
export type DocsThemeTokenName = (typeof docsThemeTokenNames)[number];

export type DocsThemeSelection = {
	colors: DocsThemeColor;
};

/**
 * Public theme stylesheet URLs. `rui-default` is already part of the page's
 * base CSS, so only optional themes need a separate asset.
 */
export type DocsThemeStylesheets = {
	themes: Record<Exclude<DocsThemeColor, 'rui-default'>, string>;
};

export const defaultDocsThemeSelection: DocsThemeSelection = {
	colors: 'rui-default',
};

type DocsThemeStylesheetsGlobal = typeof globalThis & {
	[DOCS_THEME_STYLESHEETS_GLOBAL]?: DocsThemeStylesheets;
};

function isOptionValue<T extends string>(value: unknown, options: readonly { value: T }[]): value is T {
	return typeof value === 'string' && options.some((option) => option.value === value);
}

export function isDocsThemeTokenName(value: string | undefined): value is DocsThemeTokenName {
	return typeof value === 'string' && docsThemeTokenNames.some((name) => name === value);
}

export function isDocsThemeColor(value: unknown): value is DocsThemeColor {
	return isOptionValue(value, docsThemeColorOptions);
}

/**
 * Parses stored docs preview state. Unknown or partial payloads fall back per field.
 */
export function parseDocsThemeSelection(value: unknown): DocsThemeSelection {
	if (typeof value === 'string') {
		try {
			return parseDocsThemeSelection(JSON.parse(value) as unknown);
		} catch {
			return isDocsThemeColor(value) ? { colors: value } : defaultDocsThemeSelection;
		}
	}

	if (value == null || typeof value !== 'object') {
		return defaultDocsThemeSelection;
	}

	const record = value as Record<string, unknown>;
	return {
		colors: isDocsThemeColor(record.colors) ? record.colors : defaultDocsThemeSelection.colors,
	};
}

export function updateDocsThemeSelection(
	selection: DocsThemeSelection,
	token: DocsThemeTokenName,
	value: string,
): DocsThemeSelection {
	return parseDocsThemeSelection({ ...selection, [token]: value });
}

/**
 * Reads the live docs preview attrs, then persisted storage, then defaults.
 *
 * @remarks The HTML boot script writes `data-rui-*` before paint, so connected
 * hosts usually see document attrs. Storage is the fallback for tests and a
 * missing boot script.
 */
export function readDocsThemeSelection(): DocsThemeSelection {
	const root = typeof document === 'undefined' ? null : document.documentElement;
	const { ruiTheme } = root?.dataset ?? {};
	if (ruiTheme) {
		return { colors: isDocsThemeColor(ruiTheme) ? ruiTheme : defaultDocsThemeSelection.colors };
	}

	try {
		return parseDocsThemeSelection(localStorage.getItem(DOCS_THEME_STORAGE_KEY));
	} catch {
		return defaultDocsThemeSelection;
	}
}

function readInstalledThemeStylesheets(): DocsThemeStylesheets | undefined {
	return (globalThis as DocsThemeStylesheetsGlobal)[DOCS_THEME_STYLESHEETS_GLOBAL];
}

/**
 * Registers theme asset URLs. The HTML boot script does this before paint.
 */
export function installDocsThemeStylesheets(stylesheets: DocsThemeStylesheets): void {
	(globalThis as DocsThemeStylesheetsGlobal)[DOCS_THEME_STYLESHEETS_GLOBAL] = stylesheets;
}

/**
 * Loads an optional theme from a cacheable public stylesheet and keeps the
 * previous theme active until the new file is ready.
 */
function syncThemeStylesheet(href: string | null, theme: DocsThemeColor): void {
	if (typeof document === 'undefined') return;

	if (!href) {
		document.head.querySelectorAll(`link[${DOCS_THEME_STYLESHEET_ATTR}]`).forEach((link) => link.remove());
		return;
	}

	const absoluteHref = new URL(href, document.baseURI).href;
	const existing = Array.from(
		document.head.querySelectorAll<HTMLLinkElement>(`link[${DOCS_THEME_STYLESHEET_ATTR}]`),
	).find((link) => link.href === absoluteHref);
	if (existing) return;

	const stylesheet = document.createElement('link');
	stylesheet.rel = 'stylesheet';
	stylesheet.href = href;
	stylesheet.setAttribute(DOCS_THEME_STYLESHEET_ATTR, theme);
	stylesheet.addEventListener(
		'load',
		() => {
			if (document.documentElement.dataset.ruiTheme !== theme) {
				stylesheet.remove();
				return;
			}
			document.head.querySelectorAll(`link[${DOCS_THEME_STYLESHEET_ATTR}]`).forEach((link) => {
				if (link !== stylesheet) link.remove();
			});
		},
		{ once: true },
	);
	stylesheet.addEventListener(
		'error',
		() => {
			stylesheet.remove();
			if (document.documentElement.dataset.ruiTheme === theme) {
				applyDocumentTokens(defaultDocsThemeSelection);
			}
		},
		{ once: true },
	);
	document.head.append(stylesheet);
}

function syncThemeStylesheetForSelection(selection: DocsThemeSelection, stylesheets: DocsThemeStylesheets): void {
	const href = selection.colors === 'rui-default' ? null : stylesheets.themes[selection.colors];
	syncThemeStylesheet(href, selection.colors);
}

export function applyDocumentTokens(selection: DocsThemeSelection): void {
	if (typeof document === 'undefined' || !document.documentElement) return;
	const root = document.documentElement;
	root.dataset.ruiTheme = selection.colors;
	delete root.dataset.ruiTypography;
	for (const name of ['--font-sans', '--font-heading', '--font-mono']) root.style.removeProperty(name);
	if (selection.colors === 'rui-default') applyDefaultThemeTuning(root, readDocsDefaultThemeTuning());
	else clearDefaultThemeTuning(root);
	try {
		localStorage.setItem(DOCS_THEME_STORAGE_KEY, JSON.stringify(selection));
	} catch {}

	const stylesheets = readInstalledThemeStylesheets();
	if (stylesheets) {
		syncThemeStylesheetForSelection(selection, stylesheets);
	}
}

/**
 * Blocking head script: theme and mode attributes plus the selected theme link
 * before first paint.
 */
export function createDocsThemeBootScript(stylesheets: DocsThemeStylesheets): string {
	const stylesheetsLiteral = JSON.stringify(stylesheets).replaceAll('<', '\\u003c');
	const tuningLiteral = JSON.stringify(DOCS_DEFAULT_THEME_TUNING);
	const tuningSchemaLiteral = JSON.stringify(DOCS_DEFAULT_TUNING_SCHEMA).replaceAll('<', '\\u003c');
	return `(() => {
	try {
		const root = document.documentElement;
		const preference = localStorage.getItem('theme');
		const mode = preference === 'light' || preference === 'dark' || preference === 'system' ? preference : 'system';
		const resolvedMode = mode === 'system'
			? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
			: mode;
		let stored = {};
		try { stored = JSON.parse(localStorage.getItem(${JSON.stringify(DOCS_THEME_STORAGE_KEY)}) || '{}'); } catch {}
		const savedTheme = typeof stored === 'string' ? stored : stored && typeof stored === 'object' ? stored.colors : null;
		const colors = ${JSON.stringify(docsThemeColorOptions.map((option) => option.value))}.includes(savedTheme) ? savedTheme : 'rui-default';
		const stylesheets = ${stylesheetsLiteral};
		const defaults = ${tuningLiteral};
		const tuningSchema = ${tuningSchemaLiteral};
		let tuning = {};
		try { tuning = JSON.parse(localStorage.getItem(${JSON.stringify(DOCS_DEFAULT_TUNING_STORAGE_KEY)}) || '{}'); } catch {}
		const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
		const applyDefaultTuning = () => {
			for (const [key, setting] of Object.entries(tuningSchema)) {
				const value = clamp(tuning[key], setting.min, setting.max, defaults[key]);
				root.style.setProperty(setting.cssVariable, setting.cssValueTemplate.replace('{{value}}', String(value)));
			}
		};
		const clearDefaultTuning = () => {
			for (const setting of Object.values(tuningSchema)) root.style.removeProperty(setting.cssVariable);
		};
		root.setAttribute('data-theme', resolvedMode);
		root.classList.toggle('dark', resolvedMode === 'dark');
		root.dataset.ruiTheme = colors;
		delete root.dataset.ruiTypography;
		for (const name of ['--font-sans', '--font-heading', '--font-mono']) root.style.removeProperty(name);
		if (colors === 'rui-default') applyDefaultTuning();
		else clearDefaultTuning();
		globalThis[${JSON.stringify(DOCS_THEME_STYLESHEETS_GLOBAL)}] = stylesheets;
		const attr = ${JSON.stringify(DOCS_THEME_STYLESHEET_ATTR)};
		const href = colors === 'rui-default' ? null : stylesheets.themes[colors];
		const existing = document.head.querySelector('link[' + attr + ']');
		if (!href) document.head.querySelectorAll('link[' + attr + ']').forEach((link) => link.remove());
		else if (existing?.getAttribute(attr) !== colors) {
			const stylesheet = document.createElement('link');
			stylesheet.rel = 'stylesheet';
			stylesheet.href = href;
			stylesheet.setAttribute(attr, colors);
			stylesheet.addEventListener('load', () => {
				if (root.dataset.ruiTheme !== colors) stylesheet.remove();
			}, { once: true });
			stylesheet.addEventListener('error', () => {
				stylesheet.remove();
				if (root.dataset.ruiTheme === colors) {
					root.dataset.ruiTheme = 'rui-default';
					applyDefaultTuning();
					try { localStorage.setItem(${JSON.stringify(DOCS_THEME_STORAGE_KEY)}, JSON.stringify({ colors: 'rui-default' })); } catch {}
				}
			}, { once: true });
			document.head.append(stylesheet);
		}
	} catch {}
})();`;
}

export const DOCS_DEFAULT_TUNING_STORAGE_KEY = 'radiant-ui-docs:default-theme-tuning';

export type DocsDefaultThemeTuning = {
	primaryHue: number;
	secondaryHue: number;
	neutralHue: number;
	density: number;
	radiusScale: number;
	borderAlpha: number;
};

type DocsDefaultThemeTuningKey = keyof DocsDefaultThemeTuning;

type DocsDefaultThemeTuningSetting = {
	label: string;
	min: number;
	max: number;
	step: number;
	unit: string;
	defaultValue: number;
	cssVariable: string;
	cssValueTemplate: string;
};

const DOCS_DEFAULT_TUNING_VALUE = '{{value}}';

export const DOCS_DEFAULT_TUNING_SCHEMA: Record<DocsDefaultThemeTuningKey, DocsDefaultThemeTuningSetting> = {
	primaryHue: {
		label: 'Primary hue',
		min: 0,
		max: 360,
		step: 1,
		unit: '°',
		defaultValue: 264,
		cssVariable: '--rui-primary',
		cssValueTemplate: 'oklch(52% 0.19 {{value}})',
	},
	secondaryHue: {
		label: 'Secondary hue',
		min: 0,
		max: 360,
		step: 1,
		unit: '°',
		defaultValue: 195,
		cssVariable: '--rui-secondary',
		cssValueTemplate: 'oklch(63.5% 0.095 {{value}})',
	},
	neutralHue: {
		label: 'Neutral hue',
		min: 0,
		max: 360,
		step: 1,
		unit: '°',
		defaultValue: 265,
		cssVariable: '--rui-neutral',
		cssValueTemplate: 'oklch(62% 0.014 {{value}})',
	},
	density: {
		label: 'Density',
		min: 0.85,
		max: 1.15,
		step: 0.01,
		unit: '×',
		defaultValue: 1,
		cssVariable: '--rui-density',
		cssValueTemplate: '{{value}}',
	},
	radiusScale: {
		label: 'Corner radius',
		min: 0.75,
		max: 1.25,
		step: 0.01,
		unit: '×',
		defaultValue: 1,
		cssVariable: '--rui-radius-scale',
		cssValueTemplate: '{{value}}',
	},
	borderAlpha: {
		label: 'Border opacity',
		min: 32,
		max: 100,
		step: 1,
		unit: '%',
		defaultValue: 48,
		cssVariable: '--rui-border-alpha',
		cssValueTemplate: '{{value}}%',
	},
};

export const DOCS_DEFAULT_THEME_TUNING: DocsDefaultThemeTuning = {
	primaryHue: DOCS_DEFAULT_TUNING_SCHEMA.primaryHue.defaultValue,
	secondaryHue: DOCS_DEFAULT_TUNING_SCHEMA.secondaryHue.defaultValue,
	neutralHue: DOCS_DEFAULT_TUNING_SCHEMA.neutralHue.defaultValue,
	density: DOCS_DEFAULT_TUNING_SCHEMA.density.defaultValue,
	radiusScale: DOCS_DEFAULT_TUNING_SCHEMA.radiusScale.defaultValue,
	borderAlpha: DOCS_DEFAULT_TUNING_SCHEMA.borderAlpha.defaultValue,
};

export function parseDocsDefaultThemeTuning(value: unknown): DocsDefaultThemeTuning {
	let parsed = value;
	if (typeof value === 'string') {
		try {
			parsed = JSON.parse(value) as unknown;
		} catch {
			return DOCS_DEFAULT_THEME_TUNING;
		}
	}
	if (parsed == null || typeof parsed !== 'object') return DOCS_DEFAULT_THEME_TUNING;
	const record = parsed as Record<string, unknown>;
	const valueFor = (key: keyof DocsDefaultThemeTuning): number => {
		const { min, max } = DOCS_DEFAULT_TUNING_SCHEMA[key];
		const raw = Number(record[key]);
		const fallback = DOCS_DEFAULT_THEME_TUNING[key];
		return Number.isFinite(raw) ? Math.min(max, Math.max(min, raw)) : fallback;
	};
	return {
		primaryHue: valueFor('primaryHue'),
		secondaryHue: valueFor('secondaryHue'),
		neutralHue: valueFor('neutralHue'),
		density: valueFor('density'),
		radiusScale: valueFor('radiusScale'),
		borderAlpha: valueFor('borderAlpha'),
	};
}

export function readDocsDefaultThemeTuning(): DocsDefaultThemeTuning {
	try {
		return parseDocsDefaultThemeTuning(localStorage.getItem(DOCS_DEFAULT_TUNING_STORAGE_KEY));
	} catch {
		return DOCS_DEFAULT_THEME_TUNING;
	}
}

export function applyDefaultThemeTuning(root: HTMLElement, tuning: DocsDefaultThemeTuning): void {
	for (const key of Object.keys(DOCS_DEFAULT_TUNING_SCHEMA) as DocsDefaultThemeTuningKey[]) {
		const { cssVariable, cssValueTemplate } = DOCS_DEFAULT_TUNING_SCHEMA[key];
		root.style.setProperty(cssVariable, cssValueTemplate.replace(DOCS_DEFAULT_TUNING_VALUE, String(tuning[key])));
	}
}

export function clearDefaultThemeTuning(root: HTMLElement): void {
	for (const key of Object.keys(DOCS_DEFAULT_TUNING_SCHEMA) as DocsDefaultThemeTuningKey[]) {
		root.style.removeProperty(DOCS_DEFAULT_TUNING_SCHEMA[key].cssVariable);
	}
}

export function createDocsDefaultThemeTuningCss(tuning: DocsDefaultThemeTuning): string {
	const declarations = (Object.keys(DOCS_DEFAULT_TUNING_SCHEMA) as DocsDefaultThemeTuningKey[])
		.map((key) => {
			const { cssVariable, cssValueTemplate } = DOCS_DEFAULT_TUNING_SCHEMA[key];
			const value = cssValueTemplate.replace(DOCS_DEFAULT_TUNING_VALUE, String(tuning[key]));
			return `\t${cssVariable}: ${value};`;
		})
		.join('\n');
	return `:root {\n${declarations}\n}`;
}
