export const DOCS_THEME_STORAGE_KEY = 'radiant-ui-docs:theme';

/** Boot script and `applyDocumentTokens` share this handle for packaged theme CSS. */
export const DOCS_TOKEN_PACK_GLOBAL = '__RUI_DOCS_TOKEN_PACKS';

/** Marks injected theme and axis pack `<style>` nodes. */
export const DOCS_TOKEN_SHEET_ATTR = 'data-rui-docs-token';

export const docsThemeColorOptions = [
	{ value: 'basalt', label: 'Basalt', description: 'Radiant default, cool and quiet' },
	{ value: 'github', label: 'GitHub', description: 'Clean surfaces and clear status colors' },
	{ value: 'vscode', label: 'VS Code', description: 'Editor-inspired light and dark modes' },
	{ value: 'vercel', label: 'Vercel', description: 'Layered monochrome surfaces and clear component states' },
] as const;

export const docsThemeSpacingOptions = [
	{ value: 'default', label: 'Default', description: 'Comfortable rhythm' },
	{ value: 'compact', label: 'Compact', description: 'Dense controls' },
	{ value: 'wide', label: 'Wide', description: 'Generous rhythm' },
] as const;

export const docsThemeRadiusOptions = [
	{ value: 'default', label: 'Soft', description: 'Radiant default radius' },
	{ value: 'sharp', label: 'Sharp', description: 'Square surfaces' },
] as const;

export const docsThemeTokenNames = ['colors', 'spacing', 'radius'] as const;

export type DocsThemeColor = (typeof docsThemeColorOptions)[number]['value'];
export type DocsThemeSpacing = (typeof docsThemeSpacingOptions)[number]['value'];
export type DocsThemeRadius = (typeof docsThemeRadiusOptions)[number]['value'];
export type DocsThemeTokenName = (typeof docsThemeTokenNames)[number];

export type DocsThemeSelection = {
	colors: DocsThemeColor;
	spacing: DocsThemeSpacing;
	radius: DocsThemeRadius;
};

/**
 * Published pack CSS inlined for runtime injection. `default` is the foundation
 * already on the page — only non-default packs are layered.
 */
export type DocsTokenPackCss = {
	themes: { github: string; vscode: string; vercel: string };
	spacing: { compact: string; wide: string };
	radius: { sharp: string };
};

export const defaultDocsThemeSelection: DocsThemeSelection = {
	colors: 'basalt',
	spacing: 'default',
	radius: 'default',
};

type DocsTokenPackGlobal = typeof globalThis & {
	[DOCS_TOKEN_PACK_GLOBAL]?: DocsTokenPackCss;
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

export function isDocsThemeSpacing(value: unknown): value is DocsThemeSpacing {
	return isOptionValue(value, docsThemeSpacingOptions);
}

export function isDocsThemeRadius(value: unknown): value is DocsThemeRadius {
	return isOptionValue(value, docsThemeRadiusOptions);
}

/**
 * Parses stored docs preview state. Unknown or partial payloads fall back per field.
 */
export function parseDocsThemeSelection(value: unknown): DocsThemeSelection {
	if (typeof value === 'string') {
		try {
			return parseDocsThemeSelection(JSON.parse(value) as unknown);
		} catch {
			return defaultDocsThemeSelection;
		}
	}

	if (value == null || typeof value !== 'object') {
		return defaultDocsThemeSelection;
	}

	const record = value as Record<string, unknown>;
	return {
		colors: isDocsThemeColor(record.colors) ? record.colors : defaultDocsThemeSelection.colors,
		spacing: isDocsThemeSpacing(record.spacing) ? record.spacing : defaultDocsThemeSelection.spacing,
		radius: isDocsThemeRadius(record.radius) ? record.radius : defaultDocsThemeSelection.radius,
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
	const { ruiTheme, ruiSpacing, ruiRadius } = document.documentElement.dataset;
	if (ruiTheme || ruiSpacing || ruiRadius) {
		return {
			colors: isDocsThemeColor(ruiTheme) ? ruiTheme : defaultDocsThemeSelection.colors,
			spacing: isDocsThemeSpacing(ruiSpacing) ? ruiSpacing : defaultDocsThemeSelection.spacing,
			radius: isDocsThemeRadius(ruiRadius) ? ruiRadius : defaultDocsThemeSelection.radius,
		};
	}

	return parseDocsThemeSelection(localStorage.getItem(DOCS_THEME_STORAGE_KEY));
}

function readInstalledTokenPackCss(): DocsTokenPackCss | undefined {
	return (globalThis as DocsTokenPackGlobal)[DOCS_TOKEN_PACK_GLOBAL];
}

/**
 * Registers pack CSS for injection. The HTML boot script does this before paint.
 */
export function installDocsTokenPackCss(packs: DocsTokenPackCss): void {
	(globalThis as DocsTokenPackGlobal)[DOCS_TOKEN_PACK_GLOBAL] = packs;
}

/**
 * @remarks Inline `<style>` injection applies the published pack files
 * synchronously, matching application `@import` composition.
 */
function syncTokenStylesheet(kind: 'theme' | 'spacing' | 'radius', css: string | null): void {
	if (typeof document === 'undefined') return;

	const root = document.documentElement;
	const existing = root.querySelector<HTMLStyleElement>(`style[${DOCS_TOKEN_SHEET_ATTR}="${kind}"]`);
	if (!css) {
		existing?.remove();
		return;
	}

	if (existing) {
		if (existing.textContent !== css) {
			existing.textContent = css;
		}
		return;
	}

	const style = document.createElement('style');
	style.setAttribute(DOCS_TOKEN_SHEET_ATTR, kind);
	style.textContent = css;
	const firstAxisSheet = root.querySelector(
		`style[${DOCS_TOKEN_SHEET_ATTR}="spacing"], style[${DOCS_TOKEN_SHEET_ATTR}="radius"]`,
	);
	if (kind === 'theme' && firstAxisSheet) {
		root.insertBefore(style, firstAxisSheet);
	} else {
		root.append(style);
	}
}

function syncTokenPackStylesheets(selection: DocsThemeSelection, packs: DocsTokenPackCss): void {
	const themeCss = selection.colors === 'basalt' ? null : packs.themes[selection.colors];
	syncTokenStylesheet('theme', themeCss);
	syncTokenStylesheet('spacing', selection.spacing === 'default' ? null : packs.spacing[selection.spacing]);
	syncTokenStylesheet('radius', selection.radius === 'default' ? null : packs.radius[selection.radius]);
}

export function applyDocumentTokens(selection: DocsThemeSelection): void {
	const root = document.documentElement;
	root.dataset.ruiTheme = selection.colors;
	root.dataset.ruiSpacing = selection.spacing;
	root.dataset.ruiRadius = selection.radius;
	localStorage.setItem(DOCS_THEME_STORAGE_KEY, JSON.stringify(selection));

	const packs = readInstalledTokenPackCss();
	if (packs) {
		syncTokenPackStylesheets(selection, packs);
	}
}

/**
 * Blocking head script: colour attrs, light/dark, and pack stylesheet injection
 * before first paint.
 */
export function createDocsThemeBootScript(packs: DocsTokenPackCss): string {
	const packsLiteral = JSON.stringify(packs).replaceAll('<', '\\u003c');
	return `(function(){try{const r=document.documentElement,s=localStorage.getItem('theme'),p=s==='light'||s==='dark'||s==='system'?s:'system',t=p==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p,v=localStorage.getItem(${JSON.stringify(DOCS_THEME_STORAGE_KEY)}),d=v?JSON.parse(v):{},c=${JSON.stringify(docsThemeColorOptions.map((option) => option.value))}.includes(d.colors)?d.colors:'basalt',g=d.spacing==='compact'||d.spacing==='wide'?d.spacing:'default',a=d.radius==='sharp'?'sharp':'default',packs=${packsLiteral};r.setAttribute('data-theme',t);r.classList.toggle('dark',t==='dark');r.dataset.ruiTheme=c;r.dataset.ruiSpacing=g;r.dataset.ruiRadius=a;globalThis[${JSON.stringify(DOCS_TOKEN_PACK_GLOBAL)}]=packs;var attr=${JSON.stringify(DOCS_TOKEN_SHEET_ATTR)};function sync(kind,css){var root=document.documentElement,sel='style['+attr+'="'+kind+'"]',el=root.querySelector(sel);if(!css){if(el)el.remove();return}if(el){el.textContent=css;return}var style=document.createElement('style');style.setAttribute(attr,kind);style.textContent=css;var axis=root.querySelector('style['+attr+'="spacing"],style['+attr+'="radius"]');if(kind==='theme'&&axis)root.insertBefore(style,axis);else root.appendChild(style)}sync('theme',c==='basalt'?null:packs.themes[c]);sync('spacing',g==='default'?null:packs.spacing[g]);sync('radius',a==='default'?null:packs.radius[a])}catch{}})();`;
}
