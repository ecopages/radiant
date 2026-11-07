import { DOCS_DEFAULT_THEME_TUNING, type DocsDefaultThemeTuning } from '@/lib/docs-default-theme-tuning';
import { DOCS_FONT_ROLES, type DocsFonts } from '@/lib/docs-fonts';
import {
	DOCS_THEME_QUERY_KEY,
	FONT_QUERY_KEYS,
	TUNING_QUERY_KEYS,
	docsThemeImportSpecifier,
	type DocsThemeColor,
} from '@/lib/docs-theme-preview';
import { createThemeKit, createThemeKitInstallCommand, themeKitPackageManagers } from './theme-kit';

export type ThemeSpecInput = {
	theme: DocsThemeColor;
	tuning: DocsDefaultThemeTuning;
	fonts: DocsFonts;
};

/** What an agent or a person needs to reproduce a theme in their own project. */
export type ThemeSpec = {
	theme: DocsThemeColor;
	import: string;
	packages: string[];
	install: Record<string, string>;
	css: string;
	fonts: { role: string; family: string; package: string }[];
	tuning: Partial<DocsDefaultThemeTuning>;
	query: string;
	notes: string[];
};

/**
 * The query string that reproduces a theme on the lab: the theme when it is not Radiant Default, every tuning value
 * that differs from its default, and the Fontsource id of each chosen font. Tuning only counts for Radiant Default,
 * because no other theme reads it.
 */
export function createThemeSearch({ theme, tuning, fonts }: ThemeSpecInput): string {
	const params = new URLSearchParams();
	if (theme !== 'rui-default') params.set(DOCS_THEME_QUERY_KEY, theme);
	if (theme === 'rui-default') {
		for (const [key, queryKey] of Object.entries(TUNING_QUERY_KEYS) as [keyof DocsDefaultThemeTuning, string][]) {
			if (tuning[key] !== DOCS_DEFAULT_THEME_TUNING[key]) params.set(queryKey, String(tuning[key]));
		}
	}
	for (const role of DOCS_FONT_ROLES) {
		const font = fonts[role];
		if (font) params.set(FONT_QUERY_KEYS[role], font.id);
	}
	const search = params.toString();
	return search ? `?${search}` : '';
}

/** Builds the complete, copy-ready description of a theme: install commands, stylesheet, and the lab link. */
export function createThemeSpec(input: ThemeSpecInput): ThemeSpec {
	const kit = createThemeKit(input);
	const tuning: Partial<DocsDefaultThemeTuning> = {};
	if (input.theme === 'rui-default') {
		for (const key of Object.keys(DOCS_DEFAULT_THEME_TUNING) as (keyof DocsDefaultThemeTuning)[]) {
			if (input.tuning[key] !== DOCS_DEFAULT_THEME_TUNING[key]) tuning[key] = input.tuning[key];
		}
	}
	return {
		theme: input.theme,
		import: docsThemeImportSpecifier(input.theme),
		packages: kit.packages,
		install: Object.fromEntries(
			themeKitPackageManagers.map((manager) => [manager, createThemeKitInstallCommand(manager, kit.packages)]),
		),
		css: kit.css,
		fonts: DOCS_FONT_ROLES.flatMap((role) => {
			const font = input.fonts[role];
			return font ? [{ role, family: font.family, package: font.pkg }] : [];
		}),
		tuning,
		query: createThemeSearch(input),
		notes: [
			'Paste the css into the application entry stylesheet, after installing the packages.',
			'Tailwind CSS v4 is expected, as in the Radiant UI getting started guide.',
			'Fonts come from Fontsource packages; the overrides after styles.css take precedence over the theme.',
		],
	};
}
