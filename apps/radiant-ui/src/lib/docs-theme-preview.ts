export const DOCS_THEME_STORAGE_KEY = 'radiant-ui-docs:theme';

export const docsThemeColorOptions = [
	{ value: 'glacier', label: 'Glacier', description: 'Cool, editorial' },
	{ value: 'basalt', label: 'Basalt', description: 'Carbon-inspired' },
	{ value: 'ember', label: 'Ember', description: 'Warm accent' },
	{ value: 'aurora', label: 'Aurora', description: 'Vivid and expressive' },
] as const;

export const docsThemeSpacingOptions = [
	{ value: 'default', label: 'Default', description: 'Comfortable rhythm' },
	{ value: 'compact', label: 'Compact', description: 'Dense controls' },
	{ value: 'wide', label: 'Wide', description: 'Generous rhythm' },
] as const;

export const docsThemeRadiusOptions = [
	{ value: 'default', label: 'Default', description: 'Subtle rounding' },
	{ value: 'soft', label: 'Soft', description: 'Generous rounding' },
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

export const defaultDocsThemeSelection: DocsThemeSelection = {
	colors: 'glacier',
	spacing: 'default',
	radius: 'default',
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
	const { ruiColors, ruiSpacing, ruiRadius } = document.documentElement.dataset;
	if (ruiColors || ruiSpacing || ruiRadius) {
		return {
			colors: isDocsThemeColor(ruiColors) ? ruiColors : defaultDocsThemeSelection.colors,
			spacing: isDocsThemeSpacing(ruiSpacing) ? ruiSpacing : defaultDocsThemeSelection.spacing,
			radius: isDocsThemeRadius(ruiRadius) ? ruiRadius : defaultDocsThemeSelection.radius,
		};
	}

	return parseDocsThemeSelection(localStorage.getItem(DOCS_THEME_STORAGE_KEY));
}

export function applyDocumentTokens(selection: DocsThemeSelection): void {
	const root = document.documentElement;
	root.dataset.ruiColors = selection.colors;
	root.dataset.ruiSpacing = selection.spacing;
	root.dataset.ruiRadius = selection.radius;
	localStorage.setItem(DOCS_THEME_STORAGE_KEY, JSON.stringify(selection));
}
