import { GLOBALS_UPDATED } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';
import compactSpacingCss from '../src/styles/tokens/spacing/compact.css?inline';
import wideSpacingCss from '../src/styles/tokens/spacing/wide.css?inline';
import softRadiusCss from '../src/styles/tokens/radius/soft.css?inline';
import sharpRadiusCss from '../src/styles/tokens/radius/sharp.css?inline';

const COLOR_PACKS = ['glacier', 'aurora', 'basalt', 'ember'] as const;
const SPACING_PACKS = ['default', 'compact', 'wide'] as const;
const RADIUS_PACKS = ['default', 'soft', 'sharp'] as const;

const LEGACY_THEME_LINK_ID = 'rui-storybook-theme';
const TOKEN_SHEET_ATTR = 'data-rui-storybook-token';

/**
 * Extra packs layered after the default theme — same composition as an app
 * (`@import` compact/soft after the foundation). `default` is already in the theme.
 */
const SPACING_SHEETS = {
	default: null,
	compact: compactSpacingCss,
	wide: wideSpacingCss,
} as const satisfies Record<(typeof SPACING_PACKS)[number], string | null>;

const RADIUS_SHEETS = {
	default: null,
	soft: softRadiusCss,
	sharp: sharpRadiusCss,
} as const satisfies Record<(typeof RADIUS_PACKS)[number], string | null>;

export type DesignTokenGlobals = {
	ruiColors?: string;
	ruiSpacing?: string;
	ruiRadius?: string;
	ruiColorMode?: string;
};

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
	return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * @remarks Inline `<style>` injection applies token overrides synchronously so
 * interaction tests can observe spacing/radius changes without waiting on link loads.
 */
function syncTokenStylesheet(kind: 'spacing' | 'radius', css: string | null): void {
	const existing = document.head.querySelector<HTMLStyleElement>(`style[${TOKEN_SHEET_ATTR}="${kind}"]`);
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
	style.setAttribute(TOKEN_SHEET_ATTR, kind);
	style.textContent = css;
	document.head.appendChild(style);
}

/** Remove leftover attrs/links from older theme-injection experiments. */
export function clearLegacyThemeArtifacts(): void {
	document.getElementById(LEGACY_THEME_LINK_ID)?.remove();
	document.head.querySelectorAll(`link[${TOKEN_SHEET_ATTR}]`).forEach((node) => node.remove());

	const root = document.documentElement;
	delete root.dataset.ruiTheme;
	delete root.dataset.theme;
}

/**
 * Sync Storybook toolbar globals onto the preview document.
 *
 * @remarks Spacing and radius follow the application import graph: inject only the
 * selected pack stylesheet. Colour presets stay on `data-rui-colors` because the
 * semantic layer loads every brand for comparison; that attribute is not an app API.
 */
export function applyDesignTokens(globals: DesignTokenGlobals): void {
	if (typeof document === 'undefined') return;

	clearLegacyThemeArtifacts();

	const root = document.documentElement;
	const colors = pick(String(globals.ruiColors ?? 'glacier'), COLOR_PACKS, 'glacier');
	const spacing = pick(String(globals.ruiSpacing ?? 'default'), SPACING_PACKS, 'default');
	const radius = pick(String(globals.ruiRadius ?? 'default'), RADIUS_PACKS, 'default');
	const colorMode = String(globals.ruiColorMode ?? 'light');

	root.dataset.ruiColors = colors;
	if (spacing === 'default') {
		delete root.dataset.ruiSpacing;
	} else {
		root.dataset.ruiSpacing = spacing;
	}
	if (radius === 'default') {
		delete root.dataset.ruiRadius;
	} else {
		root.dataset.ruiRadius = radius;
	}
	root.classList.toggle('dark', colorMode === 'dark');
	syncTokenStylesheet('spacing', SPACING_SHEETS[spacing]);
	syncTokenStylesheet('radius', RADIUS_SHEETS[radius]);
}

/**
 * @remarks Toolbar globals can update without re-running decorators; keeps `<html>` in sync.
 */
export function registerDesignTokenGlobalsSync(): void {
	if (typeof window === 'undefined') return;

	void addons.ready().then(() => {
		const channel = addons.getChannel();
		const sync = ({ globals }: { globals?: DesignTokenGlobals }) => {
			applyDesignTokens(globals ?? {});
		};
		channel.on(GLOBALS_UPDATED, sync);
	});
}
