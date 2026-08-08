import { GLOBALS_UPDATED } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';

const COLOR_PACKS = ['glacier', 'aurora', 'basalt', 'ember'] as const;
const SPACING_PACKS = ['default', 'compact', 'wide'] as const;
const RADIUS_PACKS = ['default', 'soft', 'sharp'] as const;

const LEGACY_THEME_LINK_ID = 'rui-storybook-theme';

export type DesignTokenGlobals = {
	ruiColors?: string;
	ruiSpacing?: string;
	ruiRadius?: string;
	ruiColorMode?: string;
};

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
	return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Remove leftover attrs/links from older theme-injection experiments. */
export function clearLegacyThemeArtifacts(): void {
	document.getElementById(LEGACY_THEME_LINK_ID)?.remove();

	const root = document.documentElement;
	delete root.dataset.ruiTheme;
	delete root.dataset.theme;
}

/**
 * Sync Storybook toolbar globals onto `<html>`.
 * Token packs are pure CSS (`data-rui-*` + `.dark`) — do not touch stylesheets here;
 * SSR link lifecycle belongs to the Radiant Storybook mount path.
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
	root.dataset.ruiSpacing = spacing;
	root.dataset.ruiRadius = radius;
	root.classList.toggle('dark', colorMode === 'dark');
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
