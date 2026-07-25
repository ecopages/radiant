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

/** Remove injected styles from older Storybook theme experiments / SSR previews. */
export function clearStorybookStyleLeaks(): void {
	document.getElementById(LEGACY_THEME_LINK_ID)?.remove();
	document.querySelectorAll('link[data-radiant-ssr-style]').forEach((node) => node.remove());

	const root = document.documentElement;
	delete root.dataset.ruiTheme;
	delete root.dataset.theme;
}

export function applyDesignTokens(globals: DesignTokenGlobals): void {
	if (typeof document === 'undefined') return;

	clearStorybookStyleLeaks();

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

export function registerDesignTokenGlobalsSync(): void {
	if (typeof window === 'undefined') return;

	// Toolbar globals can update without re-running decorators; keep <html> in sync.
	void addons.ready().then(() => {
		const channel = addons.getChannel();
		const sync = ({ globals }: { globals?: DesignTokenGlobals }) => {
			applyDesignTokens(globals ?? {});
		};
		channel.on(GLOBALS_UPDATED, sync);
	});
}
