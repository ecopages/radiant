export const DOCS_APPEARANCE_STORAGE_KEY = 'radiant-ui-docs:appearance';
/** Legacy theme-only key; read during migration and removed after a write. */
export const DOCS_THEME_STORAGE_KEY = 'radiant-ui-docs:theme';
export const DOCS_THEME_QUERY_KEY = 'rui-theme';
export const DOCS_MODE_QUERY_KEY = 'rui-mode';
export const DOCS_THEME_BOOT_PENDING_GLOBAL = '__RUI_DOCS_THEME_BOOT_PENDING';

/** Boot script and `applyDocumentTokens` share theme asset URLs. */
export const DOCS_THEME_STYLESHEETS_GLOBAL = '__RUI_DOCS_THEME_STYLESHEETS';

/** Marks the currently loaded optional theme stylesheet. */
export const DOCS_THEME_STYLESHEET_ATTR = 'data-rui-docs-theme';
export const DOCS_THEME_STYLESHEET_LOAD_EVENT = 'radiant-ui-docs:theme-stylesheet-load';

export const docsThemeColorOptions = [
	{ value: 'rui-default', label: 'Radiant Default', description: 'Radiant default, cool and quiet' },
	{ value: 'github', label: 'GitHub', description: 'Clean surfaces and clear status colors' },
	{ value: 'cloudflare', label: 'Cloudflare', description: 'Quiet neutral layers, blue actions, and amber accents' },
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

export type DocsThemeMode = 'system' | 'light' | 'dark';

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

const TUNING_QUERY_KEYS: Record<keyof DocsDefaultThemeTuning, string> = {
	primaryHue: 'rui-primary-hue',
	secondaryOffset: 'rui-secondary-offset',
	neutralHue: 'rui-neutral-hue',
	density: 'rui-density',
	radiusScale: 'rui-radius',
	borderAlpha: 'rui-border-alpha',
};

type DocsAppearance = {
	colors: DocsThemeColor;
	tuning: DocsDefaultThemeTuning;
};

function readSearchParams(): URLSearchParams | undefined {
	const location = typeof window === 'undefined' ? undefined : window.location;
	if (!location || typeof location.search !== 'string') return undefined;
	return new URLSearchParams(location.search);
}

function readStoredAppearance(): DocsAppearance {
	try {
		const stored = localStorage.getItem(DOCS_APPEARANCE_STORAGE_KEY);
		if (stored) {
			const record = JSON.parse(stored) as Record<string, unknown>;
			return {
				colors: parseDocsThemeSelection(record).colors,
				tuning: parseDocsDefaultThemeTuning(record.tuning),
			};
		}
		return {
			colors: parseDocsThemeSelection(localStorage.getItem(DOCS_THEME_STORAGE_KEY)).colors,
			tuning: DOCS_DEFAULT_THEME_TUNING,
		};
	} catch {
		return { colors: defaultDocsThemeSelection.colors, tuning: DOCS_DEFAULT_THEME_TUNING };
	}
}

function writeStoredAppearance(appearance: DocsAppearance): void {
	try {
		localStorage.setItem(DOCS_APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
		localStorage.removeItem(DOCS_THEME_STORAGE_KEY);
	} catch {}
}

function writeAppearanceUrl(appearance: DocsAppearance, mode?: DocsThemeMode): void {
	const location = typeof window === 'undefined' ? undefined : window.location;
	if (!location?.href || !window.history?.replaceState) return;
	const url = new URL(location.href);
	const setOrDelete = (key: string, value: string | undefined) => {
		if (value) url.searchParams.set(key, value);
		else url.searchParams.delete(key);
	};
	setOrDelete(DOCS_THEME_QUERY_KEY, appearance.colors === 'rui-default' ? undefined : appearance.colors);
	if (mode !== undefined) setOrDelete(DOCS_MODE_QUERY_KEY, mode === 'system' ? undefined : mode);
	for (const [key, queryKey] of Object.entries(TUNING_QUERY_KEYS) as [keyof DocsDefaultThemeTuning, string][]) {
		const value = appearance.tuning[key];
		setOrDelete(queryKey, value === DOCS_DEFAULT_THEME_TUNING[key] ? undefined : String(value));
	}
	window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function readUrlTuning(base: DocsDefaultThemeTuning): DocsDefaultThemeTuning {
	const params = readSearchParams();
	if (!params) return base;
	const overrides: Partial<DocsDefaultThemeTuning> = {};
	for (const [key, queryKey] of Object.entries(TUNING_QUERY_KEYS) as [keyof DocsDefaultThemeTuning, string][]) {
		const value = params.get(queryKey);
		if (value !== null && value.trim() && Number.isFinite(Number(value))) overrides[key] = Number(value);
	}
	return parseDocsDefaultThemeTuning({ ...base, ...overrides });
}

type DocsThemeStylesheetsGlobal = typeof globalThis & {
	[DOCS_THEME_STYLESHEETS_GLOBAL]?: DocsThemeStylesheets;
	[DOCS_THEME_BOOT_PENDING_GLOBAL]?: boolean;
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
 * Resolves URL overrides, the live docs preview attrs, persisted state, and defaults in order.
 *
 * @remarks URL state takes precedence so shared links remain reproducible. The
 * HTML boot script writes `data-rui-*` before paint; storage covers visits with
 * no explicit URL selection and environments without the boot script.
 */
export function readDocsThemeSelection(): DocsThemeSelection {
	const root = typeof document === 'undefined' ? null : document.documentElement;
	const { ruiTheme } = root?.dataset ?? {};
	const urlTheme = readSearchParams()?.get(DOCS_THEME_QUERY_KEY);
	if (isDocsThemeColor(urlTheme)) return { colors: urlTheme };
	if (ruiTheme) {
		return { colors: isDocsThemeColor(ruiTheme) ? ruiTheme : defaultDocsThemeSelection.colors };
	}
	return { colors: readStoredAppearance().colors };
}

export function readDocsThemeMode(): DocsThemeMode {
	const urlMode = readSearchParams()?.get(DOCS_MODE_QUERY_KEY);
	if (urlMode === 'light' || urlMode === 'dark' || urlMode === 'system') return urlMode;
	try {
		const stored = localStorage.getItem('theme');
		return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
	} catch {
		return 'system';
	}
}

export function writeDocsThemeMode(mode: DocsThemeMode): void {
	try {
		localStorage.setItem('theme', mode);
	} catch {}
	const appearance = { colors: readDocsThemeSelection().colors, tuning: readDocsDefaultThemeTuning() };
	writeAppearanceUrl(appearance, mode);
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
			document.defaultView?.dispatchEvent(new Event(DOCS_THEME_STYLESHEET_LOAD_EVENT));
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
	const appendStylesheet = () => {
		if (document.documentElement.dataset.ruiTheme !== theme) return;
		const active = Array.from(
			document.head.querySelectorAll<HTMLLinkElement>(`link[${DOCS_THEME_STYLESHEET_ATTR}]`),
		).find((link) => link.href === absoluteHref);
		if (!active) document.head.append(stylesheet);
	};
	if (
		document.readyState === 'loading' ||
		(globalThis as DocsThemeStylesheetsGlobal)[DOCS_THEME_BOOT_PENDING_GLOBAL] === true
	) {
		document.addEventListener('DOMContentLoaded', appendStylesheet, { once: true });
	} else {
		appendStylesheet();
	}
}

function syncThemeStylesheetForSelection(selection: DocsThemeSelection, stylesheets: DocsThemeStylesheets): void {
	const href = selection.colors === 'rui-default' ? null : stylesheets.themes[selection.colors];
	syncThemeStylesheet(href, selection.colors);
}

export function applyDocumentTokens(selection: DocsThemeSelection, options: { persist?: boolean } = {}): void {
	if (typeof document === 'undefined' || !document.documentElement) return;
	const root = document.documentElement;
	root.dataset.ruiTheme = selection.colors;
	if (selection.colors === 'rui-default') applyDefaultThemeTuning(root, readDocsDefaultThemeTuning());
	else clearDefaultThemeTuning(root);
	if (options.persist !== false) {
		const appearance = {
			...readStoredAppearance(),
			colors: selection.colors,
			tuning: readDocsDefaultThemeTuning(),
		};
		writeStoredAppearance(appearance);
		writeAppearanceUrl(appearance);
	}

	const stylesheets = readInstalledThemeStylesheets();
	if (stylesheets) {
		syncThemeStylesheetForSelection(selection, stylesheets);
	}
}

/**
 * Blocking head script applies appearance before paint and appends optional
 * theme CSS after the document's regular stylesheets have loaded.
 */
export function createDocsThemeBootScript(stylesheets: DocsThemeStylesheets): string {
	const stylesheetsLiteral = JSON.stringify(stylesheets).replaceAll('<', '\\u003c');
	const tuningLiteral = JSON.stringify(DOCS_DEFAULT_THEME_TUNING);
	const tuningSchemaLiteral = JSON.stringify(DOCS_DEFAULT_TUNING_SCHEMA).replaceAll('<', '\\u003c');
	return `(() => {
	try {
		const root = document.documentElement;
	const params = new URLSearchParams(window.location.search);
	const read = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
	let appearance = {};
	try { appearance = JSON.parse(read(${JSON.stringify(DOCS_APPEARANCE_STORAGE_KEY)}) || 'null') || {}; } catch {}
	let legacyTheme = {};
	try { legacyTheme = JSON.parse(read(${JSON.stringify(DOCS_THEME_STORAGE_KEY)}) || '{}'); } catch {}
	const requestedMode = params.get(${JSON.stringify(DOCS_MODE_QUERY_KEY)});
	const preference = requestedMode === 'light' || requestedMode === 'dark' || requestedMode === 'system'
		? requestedMode
		: read('theme');
	const mode = preference === 'light' || preference === 'dark' || preference === 'system' ? preference : 'system';
		const resolvedMode = mode === 'system'
			? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
			: mode;
	const savedTheme = appearance.colors || legacyTheme.colors;
	const urlTheme = params.get(${JSON.stringify(DOCS_THEME_QUERY_KEY)});
	const requestedTheme = ${JSON.stringify(docsThemeColorOptions.map((option) => option.value))}.includes(urlTheme) ? urlTheme : savedTheme;
	const colors = ${JSON.stringify(docsThemeColorOptions.map((option) => option.value))}.includes(requestedTheme) ? requestedTheme : 'rui-default';
		const stylesheets = ${stylesheetsLiteral};
		const defaults = ${tuningLiteral};
		const tuningSchema = ${tuningSchemaLiteral};
		const storedTuning = appearance.tuning || {};
		const tuning = { ...storedTuning };
		const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
	for (const [key, queryKey] of Object.entries(${JSON.stringify(TUNING_QUERY_KEYS)})) {
		const value = params.get(queryKey);
		if (value?.trim() && Number.isFinite(Number(value))) tuning[key] = Number(value);
	}
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
		if (colors === 'rui-default') applyDefaultTuning();
		else clearDefaultTuning();
		globalThis[${JSON.stringify(DOCS_THEME_STYLESHEETS_GLOBAL)}] = stylesheets;
	if (!read(${JSON.stringify(DOCS_APPEARANCE_STORAGE_KEY)})) {
		const migratedTuning = {};
		for (const [key, setting] of Object.entries(tuningSchema)) migratedTuning[key] = clamp(storedTuning[key], setting.min, setting.max, defaults[key]);
		try { localStorage.setItem(${JSON.stringify(DOCS_APPEARANCE_STORAGE_KEY)}, JSON.stringify({ colors: savedTheme || 'rui-default', tuning: migratedTuning })); } catch {}
	}
		const attr = ${JSON.stringify(DOCS_THEME_STYLESHEET_ATTR)};
		const href = colors === 'rui-default' ? null : stylesheets.themes[colors];
	globalThis[${JSON.stringify(DOCS_THEME_BOOT_PENDING_GLOBAL)}] = Boolean(href);
	if (href) root.style.visibility = 'hidden';
		const existing = document.head.querySelector('link[' + attr + ']');
	if (!href) {
		globalThis[${JSON.stringify(DOCS_THEME_BOOT_PENDING_GLOBAL)}] = false;
		document.head.querySelectorAll('link[' + attr + ']').forEach((link) => link.remove());
	}
		else if (existing?.getAttribute(attr) !== colors) {
			const attachTheme = () => {
			globalThis[${JSON.stringify(DOCS_THEME_BOOT_PENDING_GLOBAL)}] = false;
				if (root.dataset.ruiTheme !== colors) return;
			const active = document.head.querySelector('link[' + attr + ']');
			if (active?.getAttribute(attr) === colors) {
				active.addEventListener('load', () => root.style.removeProperty('visibility'), { once: true });
				active.addEventListener('error', () => root.style.removeProperty('visibility'), { once: true });
				return;
			}
				const stylesheet = document.createElement('link');
				stylesheet.rel = 'stylesheet';
				stylesheet.href = href;
				stylesheet.setAttribute(attr, colors);
				stylesheet.addEventListener('load', () => {
					if (root.dataset.ruiTheme !== colors) stylesheet.remove();
					root.style.removeProperty('visibility');
				}, { once: true });
				stylesheet.addEventListener('error', () => {
					stylesheet.remove();
					if (root.dataset.ruiTheme === colors) {
						root.dataset.ruiTheme = 'rui-default';
						applyDefaultTuning();
						appearance.colors = 'rui-default';
						try { localStorage.setItem(${JSON.stringify(DOCS_APPEARANCE_STORAGE_KEY)}, JSON.stringify(appearance)); } catch {}
					}
					root.style.removeProperty('visibility');
				}, { once: true });
				document.head.append(stylesheet);
			};
			if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachTheme, { once: true });
			else attachTheme();
		}
	} catch {}
})();`;
}

export type DocsDefaultThemeTuning = {
	primaryHue: number;
	secondaryOffset: number;
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
	secondaryOffset: {
		label: 'Secondary offset',
		min: -180,
		max: 180,
		step: 1,
		unit: '°',
		defaultValue: 40,
		cssVariable: '--rui-secondary',
		cssValueTemplate: 'oklch(from var(--rui-primary) 63.5% 0.095 calc(h + {{value}}))',
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
		min: 8,
		max: 100,
		step: 1,
		unit: '%',
		defaultValue: 20,
		cssVariable: '--rui-border-alpha',
		cssValueTemplate: '{{value}}%',
	},
};

export const DOCS_DEFAULT_THEME_TUNING: DocsDefaultThemeTuning = {
	primaryHue: DOCS_DEFAULT_TUNING_SCHEMA.primaryHue.defaultValue,
	secondaryOffset: DOCS_DEFAULT_TUNING_SCHEMA.secondaryOffset.defaultValue,
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
		secondaryOffset: valueFor('secondaryOffset'),
		neutralHue: valueFor('neutralHue'),
		density: valueFor('density'),
		radiusScale: valueFor('radiusScale'),
		borderAlpha: valueFor('borderAlpha'),
	};
}

export function readDocsDefaultThemeTuning(): DocsDefaultThemeTuning {
	return readUrlTuning(readStoredAppearance().tuning);
}

export function writeDocsDefaultThemeTuning(tuning: DocsDefaultThemeTuning): void {
	const appearance = {
		colors: readDocsThemeSelection().colors,
		tuning: parseDocsDefaultThemeTuning(tuning),
	};
	writeStoredAppearance(appearance);
	writeAppearanceUrl(appearance);
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
