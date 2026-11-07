import {
	applyDefaultThemeTuning,
	DOCS_DEFAULT_THEME_TUNING,
	DOCS_TUNING_CHANGE_EVENT,
	parseDocsDefaultThemeTuning,
	type DocsDefaultThemeTuning,
} from './docs-default-theme-tuning';
import { docsFontsEqual, parseDocsFonts, type DocsFonts } from './docs-fonts';
import {
	applyDocumentTokens,
	isDocsThemeColor,
	readDocsDefaultThemeTuning,
	readDocsFonts,
	readDocsThemeSelection,
	writeDocsDefaultThemeTuning,
	writeDocsFonts,
	type DocsThemeColor,
} from './docs-theme-preview';

export const DOCS_SAVED_THEMES_STORAGE_KEY = 'radiant-ui-docs:saved-themes';
export const DOCS_SAVED_THEMES_CHANGE_EVENT = 'radiant-ui-docs:saved-themes-change';
export const DOCS_SAVED_THEMES_LIMIT = 20;
const NAME_LIMIT = 40;

/** A named snapshot of the lab's appearance: a base theme, its Radiant Default tuning, and the fonts. */
export type DocsSavedTheme = {
	id: string;
	name: string;
	colors: DocsThemeColor;
	/** Only meaningful when `colors` is Radiant Default. */
	tuning: DocsDefaultThemeTuning;
	fonts: DocsFonts;
};

export type DocsAppearanceSnapshot = Omit<DocsSavedTheme, 'id' | 'name'>;

function parseSavedTheme(value: unknown): DocsSavedTheme | undefined {
	if (value == null || typeof value !== 'object') return undefined;
	const record = value as Record<string, unknown>;
	if (typeof record.id !== 'string' || !record.id || typeof record.name !== 'string' || !record.name.trim()) {
		return undefined;
	}
	if (!isDocsThemeColor(record.colors)) return undefined;
	return {
		id: record.id,
		name: record.name.trim().slice(0, NAME_LIMIT),
		colors: record.colors,
		tuning: parseDocsDefaultThemeTuning(record.tuning),
		fonts: parseDocsFonts(record.fonts),
	};
}

/** Saved themes, oldest first. Unreadable storage and malformed entries read as absent. */
export function readSavedThemes(): DocsSavedTheme[] {
	try {
		const stored = JSON.parse(localStorage.getItem(DOCS_SAVED_THEMES_STORAGE_KEY) ?? '[]') as unknown;
		if (!Array.isArray(stored)) return [];
		return stored.flatMap((entry) => parseSavedTheme(entry) ?? []).slice(0, DOCS_SAVED_THEMES_LIMIT);
	} catch {
		return [];
	}
}

function writeSavedThemes(themes: DocsSavedTheme[]): void {
	try {
		localStorage.setItem(DOCS_SAVED_THEMES_STORAGE_KEY, JSON.stringify(themes));
	} catch {}
	document.dispatchEvent(new CustomEvent(DOCS_SAVED_THEMES_CHANGE_EVENT));
}

/** What the visitor currently sees: the theme, its tuning, and the fonts. */
export function readCurrentAppearance(): DocsAppearanceSnapshot {
	return {
		colors: readDocsThemeSelection().colors,
		tuning: readDocsDefaultThemeTuning(),
		fonts: readDocsFonts(),
	};
}

export function isAppearanceCustomized(appearance: DocsAppearanceSnapshot): boolean {
	return (
		appearance.colors !== 'rui-default' ||
		Object.keys(appearance.fonts).length > 0 ||
		JSON.stringify(appearance.tuning) !== JSON.stringify(DOCS_DEFAULT_THEME_TUNING)
	);
}

/**
 * Whether the current look differs from an untouched built-in theme and from every saved theme, so saving it adds
 * something. A plain built-in theme is not worth saving.
 */
export function canSaveCurrentTheme(
	current: DocsAppearanceSnapshot,
	saved: DocsAppearanceSnapshot[] = readSavedThemes(),
): boolean {
	const tuned =
		current.colors === 'rui-default' &&
		JSON.stringify(current.tuning) !== JSON.stringify(DOCS_DEFAULT_THEME_TUNING);
	const changed = Object.keys(current.fonts).length > 0 || tuned;
	return changed && !saved.some((theme) => isSavedThemeActive(theme, current));
}

/** Whether `theme` is what the visitor currently sees. Tuning only counts for Radiant Default. */
export function isSavedThemeActive(theme: DocsAppearanceSnapshot, current = readCurrentAppearance()): boolean {
	return (
		theme.colors === current.colors &&
		docsFontsEqual(theme.fonts, current.fonts) &&
		(theme.colors !== 'rui-default' || JSON.stringify(theme.tuning) === JSON.stringify(current.tuning))
	);
}

/** Saves the current appearance under `name`, replacing a saved theme with the same name. Returns it. */
export function saveCurrentTheme(name: string): DocsSavedTheme | undefined {
	const trimmed = name.trim().slice(0, NAME_LIMIT);
	if (!trimmed) return undefined;
	const existing = readSavedThemes();
	const previous = existing.find((theme) => theme.name.toLowerCase() === trimmed.toLowerCase());
	const saved: DocsSavedTheme = {
		id: previous?.id ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
		name: trimmed,
		...readCurrentAppearance(),
	};
	const others = existing.filter((theme) => theme.id !== saved.id);
	writeSavedThemes([...others, saved].slice(-DOCS_SAVED_THEMES_LIMIT));
	return saved;
}

export function deleteSavedTheme(id: string): void {
	writeSavedThemes(readSavedThemes().filter((theme) => theme.id !== id));
}

/** Applies a saved theme to every docs page: its base theme, its tuning for Radiant Default, and its fonts. */
export function applySavedTheme(theme: DocsAppearanceSnapshot): void {
	applyDocumentTokens({ colors: theme.colors });
	if (theme.colors === 'rui-default') {
		writeDocsDefaultThemeTuning(theme.tuning);
		applyDefaultThemeTuning(document.documentElement, theme.tuning);
	}
	writeDocsFonts(theme.fonts);
	document.dispatchEvent(new CustomEvent(DOCS_TUNING_CHANGE_EVENT, { detail: theme.tuning }));
}
