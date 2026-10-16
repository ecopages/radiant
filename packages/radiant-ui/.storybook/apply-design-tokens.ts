import { GLOBALS_UPDATED } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';
import githubThemeCss from '@ecopages/radiant-themes/compiled/github.css?inline';
import vscodeThemeCss from '@ecopages/radiant-themes/compiled/vscode.css?inline';
import materialThemeCss from '@ecopages/radiant-themes/compiled/material.css?inline';
import vercelThemeCss from '@ecopages/radiant-themes/compiled/vercel.css?inline';
import highContrastThemeCss from '@ecopages/radiant-themes/compiled/high-contrast.css?inline';
import windows95ThemeCss from '@ecopages/radiant-themes/compiled/windows95.css?inline';
import macOsClassicThemeCss from '@ecopages/radiant-themes/compiled/macos-classic.css?inline';
import macOsThemeCss from '@ecopages/radiant-themes/compiled/macos.css?inline';

const THEME_PACKS = [
	'rui-default',
	'github',
	'vscode',
	'material',
	'vercel',
	'high-contrast',
	'windows95',
	'macos-classic',
	'macos',
] as const;

const LEGACY_THEME_LINK_ID = 'rui-storybook-theme';
const TOKEN_SHEET_ATTR = 'data-rui-storybook-theme';

const THEME_SHEETS = {
	'rui-default': null,
	github: githubThemeCss,
	vscode: vscodeThemeCss,
	material: materialThemeCss,
	vercel: vercelThemeCss,
	'high-contrast': highContrastThemeCss,
	windows95: windows95ThemeCss,
	'macos-classic': macOsClassicThemeCss,
	macos: macOsThemeCss,
} as const satisfies Record<(typeof THEME_PACKS)[number], string | null>;

export type DesignTokenGlobals = {
	ruiTheme?: string;
	ruiColorMode?: string;
};

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
	return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function syncThemeStylesheet(css: string | null): void {
	const existing = document.head.querySelector<HTMLStyleElement>(`style[${TOKEN_SHEET_ATTR}]`);
	if (!css) {
		existing?.remove();
		return;
	}

	if (existing) {
		if (existing.textContent !== css) existing.textContent = css;
		return;
	}

	const style = document.createElement('style');
	style.setAttribute(TOKEN_SHEET_ATTR, '');
	style.textContent = css;
	document.head.appendChild(style);
}

/** Remove stylesheet artifacts and attributes left by the earlier axis-based preview. */
export function clearLegacyThemeArtifacts(): void {
	document.getElementById(LEGACY_THEME_LINK_ID)?.remove();
	document.head
		.querySelectorAll('style[data-rui-storybook-token], link[data-rui-storybook-token]')
		.forEach((node) => node.remove());

	const root = document.documentElement;
	delete root.dataset.ruiColors;
	delete root.dataset.theme;
	delete root.dataset.ruiSpacing;
	delete root.dataset.ruiRadius;
}

/**
 * Sync Storybook's theme and color mode globals onto the preview document.
 *
 * @remarks Optional themes are complete visual systems; only Radiant Default
 * exposes palette and density tuning in the documentation playground.
 */
export function applyDesignTokens(globals: DesignTokenGlobals): void {
	if (typeof document === 'undefined') return;

	clearLegacyThemeArtifacts();

	const root = document.documentElement;
	const theme = pick(String(globals.ruiTheme ?? 'rui-default'), THEME_PACKS, 'rui-default');
	const colorMode = String(globals.ruiColorMode ?? 'light');
	root.dataset.ruiTheme = theme;
	root.classList.toggle('dark', colorMode === 'dark');
	syncThemeStylesheet(THEME_SHEETS[theme]);
}

/** Keep the preview document in sync when Storybook toolbar globals change. */
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
