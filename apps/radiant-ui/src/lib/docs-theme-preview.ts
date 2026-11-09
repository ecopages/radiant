import {
	applyDefaultThemeTuning,
	clearDefaultThemeTuning,
	DOCS_DEFAULT_THEME_TUNING,
	DOCS_DEFAULT_TUNING_SCHEMA,
	DOCS_TUNING_CHANGE_EVENT,
	parseDocsDefaultThemeTuning,
	type DocsDefaultThemeTuning,
} from './docs-default-theme-tuning';
import {
	applyDocsFonts,
	DOCS_FONT_PATTERNS,
	DOCS_FONT_ROLES,
	DOCS_HEAD_PERSIST_ATTR,
	DOCS_FONT_VARIABLES,
	parseDocsFonts,
	type DocsFonts,
} from './docs-fonts';

export const DOCS_APPEARANCE_STORAGE_KEY = 'radiant-ui-docs:appearance';

/**
 * @remarks Records store only the tuning values a visitor changed, so a changed default reaches everyone who has not
 * customized it. Records without this version were written when every value, defaults included, was persisted, and
 * their tuning is ignored.
 */
export const DOCS_APPEARANCE_VERSION = 2;
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
	{ value: 'zed', label: 'Zed', description: 'Flat, dense editor surfaces with quiet accent states' },
] as const;

export const docsThemeTokenNames = ['colors'] as const;

export type DocsThemeColor = (typeof docsThemeColorOptions)[number]['value'];

/** Import specifier for Radiant Default, which is also the text docs samples show before a theme is chosen. */
export const DOCS_DEFAULT_THEME_IMPORT = '@ecopages/radiant-ui/themes/default';

/** The package import a visitor would write to use `theme`: Radiant Default, or a theme from Radiant Themes. */
export function docsThemeImportSpecifier(theme: DocsThemeColor): string {
	return theme === 'rui-default' ? DOCS_DEFAULT_THEME_IMPORT : `@ecopages/radiant-themes/${theme}`;
}
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

export const TUNING_QUERY_KEYS: Record<keyof DocsDefaultThemeTuning, string> = {
	primaryHue: 'rui-primary-hue',
	secondaryOffset: 'rui-secondary-offset',
	neutralHue: 'rui-neutral-hue',
	neutralTint: 'rui-neutral-tint',
	density: 'rui-density',
	radiusScale: 'rui-radius',
	borderAlpha: 'rui-border-alpha',
};

type DocsAppearance = {
	colors: DocsThemeColor;
	tuning: DocsDefaultThemeTuning;
	fonts: DocsFonts;
};

export const FONT_QUERY_KEYS = { sans: 'rui-font-sans', heading: 'rui-font-heading', mono: 'rui-font-mono' } as const;

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
				tuning:
					record.v === DOCS_APPEARANCE_VERSION
						? parseDocsDefaultThemeTuning(record.tuning)
						: DOCS_DEFAULT_THEME_TUNING,
				fonts: parseDocsFonts(record.fonts),
			};
		}
		return {
			colors: parseDocsThemeSelection(localStorage.getItem(DOCS_THEME_STORAGE_KEY)).colors,
			tuning: DOCS_DEFAULT_THEME_TUNING,
			fonts: {},
		};
	} catch {
		return { colors: defaultDocsThemeSelection.colors, tuning: DOCS_DEFAULT_THEME_TUNING, fonts: {} };
	}
}

function writeStoredAppearance(appearance: DocsAppearance): void {
	try {
		const overrides = Object.fromEntries(
			Object.entries(appearance.tuning).filter(
				([key, value]) => value !== DOCS_DEFAULT_THEME_TUNING[key as keyof DocsDefaultThemeTuning],
			),
		);
		localStorage.setItem(
			DOCS_APPEARANCE_STORAGE_KEY,
			JSON.stringify({
				v: DOCS_APPEARANCE_VERSION,
				colors: appearance.colors,
				tuning: overrides,
				fonts: appearance.fonts,
			}),
		);
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
	for (const role of DOCS_FONT_ROLES) setOrDelete(FONT_QUERY_KEYS[role], appearance.fonts[role]?.id);
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
	const appearance = {
		colors: readDocsThemeSelection().colors,
		tuning: readDocsDefaultThemeTuning(),
		fonts: readStoredAppearance().fonts,
	};
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
	stylesheet.setAttribute(DOCS_HEAD_PERSIST_ATTR, '');
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

/**
 * Keeps the theme stylesheet last in `<head>` after each router navigation.
 *
 * @remarks The router never touches the theme link because it carries `data-eco-persist`, but it appends the next
 * page's new stylesheets after it, and the theme's unlayered rules must follow every other stylesheet to win. A
 * duplicate link is appended instead of moving the original, so the theme stays loaded and the page never repaints in
 * the default theme; the original is removed once the duplicate has loaded.
 */
export function keepDocsThemeStylesheetLast(): void {
	document.addEventListener('eco:after-swap', () => {
		const link = document.head.querySelector<HTMLLinkElement>(`link[${DOCS_THEME_STYLESHEET_ATTR}]`);
		const last = Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style')).at(-1);
		if (!link || !last || link === last) return;
		const next = link.cloneNode() as HTMLLinkElement;
		next.addEventListener('load', () => link.remove(), { once: true });
		next.addEventListener('error', () => next.remove(), { once: true });
		document.head.append(next);
	});
}

function syncThemeStylesheetForSelection(selection: DocsThemeSelection, stylesheets: DocsThemeStylesheets): void {
	const href = selection.colors === 'rui-default' ? null : stylesheets.themes[selection.colors];
	syncThemeStylesheet(href, selection.colors);
}

/**
 * @remarks With persistence on, which is how a visitor's choice reaches this function, picking a different theme resets
 * Radiant Default's tuning, so returning to it starts from the defaults and shared tuning parameters leave the URL.
 */
export function applyDocumentTokens(selection: DocsThemeSelection, options: { persist?: boolean } = {}): void {
	if (typeof document === 'undefined' || !document.documentElement) return;
	const root = document.documentElement;
	if (options.persist !== false) {
		const themeChanged = readDocsThemeSelection().colors !== selection.colors;
		const appearance = {
			...readStoredAppearance(),
			colors: selection.colors,
			tuning: themeChanged ? DOCS_DEFAULT_THEME_TUNING : readDocsDefaultThemeTuning(),
		};
		writeStoredAppearance(appearance);
		writeAppearanceUrl(appearance);
	}
	root.dataset.ruiTheme = selection.colors;
	if (selection.colors === 'rui-default') applyDefaultThemeTuning(root, readDocsDefaultThemeTuning());
	else clearDefaultThemeTuning(root);

	applyDocsFonts(root, readStoredAppearance().fonts);

	const stylesheets = readInstalledThemeStylesheets();
	if (stylesheets) {
		syncThemeStylesheetForSelection(selection, stylesheets);
	}
}

/** The fonts the visitor chose, which apply on every docs page until reset. */
export function readDocsFonts(): DocsFonts {
	return readStoredAppearance().fonts;
}

/** Stores and applies `fonts`, replacing the previous choice. */
export function writeDocsFonts(fonts: DocsFonts): void {
	if (typeof document === 'undefined' || !document.documentElement) return;
	const appearance = { ...readStoredAppearance(), fonts: parseDocsFonts(fonts) };
	writeStoredAppearance(appearance);
	writeAppearanceUrl(appearance);
	applyDocsFonts(document.documentElement, appearance.fonts);
}

/** Returns every docs page to Radiant Default: the theme, its tuning and the fonts. */
export function resetDocsAppearance(): void {
	const appearance: DocsAppearance = {
		colors: defaultDocsThemeSelection.colors,
		tuning: DOCS_DEFAULT_THEME_TUNING,
		fonts: {},
	};
	writeStoredAppearance(appearance);
	writeAppearanceUrl(appearance);
	applyDocumentTokens(defaultDocsThemeSelection, { persist: false });
}

/**
 * Blocking head script applies appearance before paint and appends optional
 * theme CSS after the document's regular stylesheets.
 *
 * @remarks The document's stylesheets are injected after this script, and the theme must follow them in the
 * cascade, so the link is appended when `<body>` appears: every head stylesheet has been parsed by then, and the
 * request starts long before `DOMContentLoaded`, which waits for every deferred module. The page stays hidden until
 * the link loads, so a visitor never sees the default theme.
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
		const storedTuning = appearance.v === ${DOCS_APPEARANCE_VERSION} ? appearance.tuning || {} : {};
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
		const fontPatterns = ${JSON.stringify(DOCS_FONT_PATTERNS)};
		const fontVariables = ${JSON.stringify(DOCS_FONT_VARIABLES)};
		const storedFonts = appearance.fonts && typeof appearance.fonts === 'object' ? appearance.fonts : {};
		for (const [role, variable] of Object.entries(fontVariables)) {
			const font = storedFonts[role];
			if (!font || typeof font !== 'object') continue;
			if (!['id', 'family', 'pkg', 'fallback'].every((key) => typeof font[key] === 'string' && new RegExp(fontPatterns[key]).test(font[key]))) continue;
			if (role === 'mono' && font.kind !== 'mono') continue;
			root.style.setProperty(variable, "'" + font.family + "', " + font.fallback);
			if (!document.getElementById('rui-docs-font-' + font.id)) {
				const link = document.createElement('link');
				link.id = 'rui-docs-font-' + font.id;
				link.rel = 'stylesheet';
				link.href = 'https://cdn.jsdelivr.net/npm/' + font.pkg + '@5/index.css';
				link.setAttribute(${JSON.stringify(DOCS_HEAD_PERSIST_ATTR)}, '');
				document.head.append(link);
			}
		}
		root.setAttribute('data-theme', resolvedMode);
		root.classList.toggle('dark', resolvedMode === 'dark');
		root.dataset.ruiTheme = colors;
		if (colors === 'rui-default') applyDefaultTuning();
		else clearDefaultTuning();
		globalThis[${JSON.stringify(DOCS_THEME_STYLESHEETS_GLOBAL)}] = stylesheets;
	if (!read(${JSON.stringify(DOCS_APPEARANCE_STORAGE_KEY)})) {
		try { localStorage.setItem(${JSON.stringify(DOCS_APPEARANCE_STORAGE_KEY)}, JSON.stringify({ v: ${DOCS_APPEARANCE_VERSION}, colors: savedTheme || 'rui-default', tuning: {}, fonts: {} })); } catch {}
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
				stylesheet.setAttribute(${JSON.stringify(DOCS_HEAD_PERSIST_ATTR)}, '');
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
			if (document.body) attachTheme();
			else new MutationObserver((_, observer) => {
				if (!document.body) return;
				observer.disconnect();
				attachTheme();
			}).observe(document.documentElement, { childList: true });
		}
	} catch {}
})();`;
}

export function readDocsDefaultThemeTuning(): DocsDefaultThemeTuning {
	return readUrlTuning(readStoredAppearance().tuning);
}

/**
 * Merges `changes` into the Radiant Default tuning, stores it, applies it to the document, and announces it so the
 * sliders and the generated CSS follow.
 */
export function updateDocsDefaultThemeTuning(changes: Partial<DocsDefaultThemeTuning>): DocsDefaultThemeTuning {
	const tuning = parseDocsDefaultThemeTuning({ ...readDocsDefaultThemeTuning(), ...changes });
	writeDocsDefaultThemeTuning(tuning);
	if (typeof document !== 'undefined' && document.documentElement?.dataset.ruiTheme === 'rui-default') {
		applyDefaultThemeTuning(document.documentElement, tuning);
	}
	document.dispatchEvent(new CustomEvent(DOCS_TUNING_CHANGE_EVENT, { detail: tuning }));
	return tuning;
}

export function writeDocsDefaultThemeTuning(tuning: DocsDefaultThemeTuning): void {
	const appearance = {
		colors: readDocsThemeSelection().colors,
		tuning: parseDocsDefaultThemeTuning(tuning),
		fonts: readStoredAppearance().fonts,
	};
	writeStoredAppearance(appearance);
	writeAppearanceUrl(appearance);
}
