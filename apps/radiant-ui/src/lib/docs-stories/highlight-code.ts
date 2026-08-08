import { getSingletonHighlighter, type Highlighter } from 'shiki';

/** Matches `rehypePrettyCode` theme config in `eco.config.ts`. */
const DOCS_CODE_THEMES = { light: 'light-plus', dark: 'dark-plus' } as const;

const SHIKI_KEY = Symbol.for('@radiant-ui/docs-shiki');

type ShikiGlobal = typeof globalThis & {
	[SHIKI_KEY]?: Promise<Highlighter>;
};

/**
 * @remarks Example code is highlighted from multiple SSR/client bundles; cache the
 * highlighter on `globalThis` so we do not create one Shiki instance per bundle.
 */
function getSharedHighlighter(): Promise<Highlighter> {
	const globalStore = globalThis as ShikiGlobal;
	globalStore[SHIKI_KEY] ??= getSingletonHighlighter({
		themes: [DOCS_CODE_THEMES.light, DOCS_CODE_THEMES.dark],
		langs: ['tsx'],
	});
	return globalStore[SHIKI_KEY];
}

const highlighter: Highlighter = await getSharedHighlighter();

/** Shiki HTML for live example snippets (same themes as MDX fenced blocks). */
export function highlightExampleCode(code: string): string {
	return highlighter.codeToHtml(code, {
		lang: 'tsx',
		themes: DOCS_CODE_THEMES,
		defaultColor: false,
	});
}
