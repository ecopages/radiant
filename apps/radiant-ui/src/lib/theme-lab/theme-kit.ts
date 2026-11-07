import {
	createDocsDefaultThemeTuningCss,
	DOCS_DEFAULT_THEME_TUNING,
	type DocsDefaultThemeTuning,
} from '@/lib/docs-default-theme-tuning';
import {
	DOCS_FONT_ROLES,
	DOCS_FONT_VARIABLES,
	docsFontFitsRole,
	docsFontStack,
	type DocsFont,
	type DocsFonts,
	type DocsFontRole,
} from '@/lib/docs-fonts';
import { docsThemeImportSpecifier, type DocsThemeColor } from '@/lib/docs-theme-preview';

export type ThemeKitPackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export const themeKitPackageManagers: readonly ThemeKitPackageManager[] = ['pnpm', 'npm', 'yarn', 'bun'];

function selectedFonts(fonts: DocsFonts): Map<DocsFontRole, DocsFont> {
	const selected = new Map<DocsFontRole, DocsFont>();
	for (const role of DOCS_FONT_ROLES) {
		const font = fonts[role];
		if (font && docsFontFitsRole(font.kind, role)) selected.set(role, font);
	}
	return selected;
}

export type ThemeKit = {
	/** Every npm package the copied CSS needs, in install order. */
	packages: string[];
	/** The stylesheet to paste into the application entry CSS. */
	css: string;
};

/**
 * Builds the install list and entry stylesheet for a theme, font choice and Radiant Default tuning.
 *
 * @remarks
 * Fontsource imports come first so `@font-face` rules exist before use. Overrides come after `styles.css` so they win
 * over the theme. Tuning applies to Radiant Default only, so other themes never receive those variables.
 */
export function createThemeKit(input: {
	theme: DocsThemeColor;
	fonts: DocsFonts;
	tuning?: DocsDefaultThemeTuning;
}): ThemeKit {
	const fonts = selectedFonts(input.fonts);
	const fontPackages = [...new Set([...fonts.values()].map((font) => font.pkg))];
	const packages = [
		'@ecopages/radiant-ui',
		...(input.theme === 'rui-default' ? [] : ['@ecopages/radiant-themes']),
		...fontPackages,
	];

	const lines = [
		"@import 'tailwindcss';",
		...fontPackages.map((pkg) => `@import '${pkg}';`),
		`@import '${docsThemeImportSpecifier(input.theme)}';`,
		"@import '@ecopages/radiant-ui/styles.css';",
	];

	const declarations = [...fonts.entries()].map(
		([role, font]) => `\t${DOCS_FONT_VARIABLES[role]}: ${docsFontStack(font)};`,
	);
	if (input.theme === 'rui-default' && input.tuning) {
		const changed = createDocsDefaultThemeTuningCss(input.tuning);
		const isDefault = changed === createDocsDefaultThemeTuningCss(DOCS_DEFAULT_THEME_TUNING);
		if (!isDefault) {
			declarations.push(...changed.split('\n').slice(1, -1));
		}
	}

	const css =
		declarations.length > 0
			? `${lines.join('\n')}\n\n:root {\n${declarations.join('\n')}\n}\n`
			: `${lines.join('\n')}\n`;
	return { packages, css };
}

/** The shell command that installs `packages` with `manager`. */
export function createThemeKitInstallCommand(manager: ThemeKitPackageManager, packages: readonly string[]): string {
	const list = packages.join(' ');
	switch (manager) {
		case 'npm':
			return `npm install ${list}`;
		case 'yarn':
			return `yarn add ${list}`;
		case 'bun':
			return `bun add ${list}`;
		default:
			return `pnpm add ${list}`;
	}
}
