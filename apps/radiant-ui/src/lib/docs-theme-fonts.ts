import type { DocsFontRole } from './docs-fonts';
import type { DocsThemeColor } from './docs-theme-preview';

/**
 * The fonts each docs theme uses when the visitor chooses none, as the names shown in the font fields.
 *
 * @remarks
 * Radiant Default shows the docs type (IBM Plex), which `styles/theme.css` sets for the docs. The other entries
 * mirror the first family each theme's `--font-*` stack names, or a system label when the stack is system fonts only.
 * `docs-theme-fonts.test.ts` checks the named families against the theme CSS so the two cannot drift.
 */
export const docsThemeDefaultFonts: Record<DocsThemeColor, Record<DocsFontRole, string>> = {
	'rui-default': { sans: 'IBM Plex Sans', heading: 'IBM Plex Sans', mono: 'IBM Plex Mono' },
	github: { sans: 'System UI', heading: 'System UI', mono: 'System monospace' },
	cloudflare: { sans: 'System UI', heading: 'System UI', mono: 'System monospace' },
	vscode: { sans: 'System UI', heading: 'System UI', mono: 'System monospace' },
	vercel: { sans: 'Geist', heading: 'Geist', mono: 'Geist Mono' },
	material: { sans: 'Roboto', heading: 'Roboto', mono: 'Roboto Mono' },
	'high-contrast': { sans: 'System UI', heading: 'System UI', mono: 'System monospace' },
	windows95: { sans: 'Tahoma', heading: 'Tahoma', mono: 'Lucida Console' },
	'macos-classic': { sans: 'Charcoal', heading: 'Charcoal', mono: 'Monaco' },
	macos: { sans: 'SF Pro Text', heading: 'SF Pro Display', mono: 'SF Mono' },
	zed: { sans: 'IBM Plex Sans', heading: 'IBM Plex Sans', mono: 'Lilex' },
};
