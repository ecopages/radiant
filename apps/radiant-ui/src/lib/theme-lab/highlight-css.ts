import type { HighlighterCore } from 'shiki/core';

let highlighter: Promise<HighlighterCore> | undefined;

/**
 * Loads a minimal Shiki highlighter once: the CSS grammar and the two docs themes on the JavaScript regex engine, so
 * the browser downloads kilobytes instead of the full bundle and no WebAssembly.
 */
function loadHighlighter(): Promise<HighlighterCore> {
	highlighter ??= (async () => {
		const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, css, lightPlus, darkPlus] =
			await Promise.all([
				import('shiki/core'),
				import('shiki/engine/javascript'),
				import('shiki/langs/css.mjs'),
				import('shiki/themes/light-plus.mjs'),
				import('shiki/themes/dark-plus.mjs'),
			]);
		return createHighlighterCore({
			langs: [css.default],
			themes: [lightPlus.default, darkPlus.default],
			engine: createJavaScriptRegexEngine(),
		});
	})();
	return highlighter;
}

/**
 * Highlights `code` as CSS and wraps it in the figure the docs code styles target, the same markup the docs pages use.
 * Colors follow the page theme through `--shiki-light` and `--shiki-dark` variables.
 */
export async function highlightCssFigure(code: string): Promise<string> {
	const instance = await loadHighlighter();
	const html = instance.codeToHtml(code, {
		lang: 'css',
		themes: { light: 'light-plus', dark: 'dark-plus' },
		defaultColor: false,
	});
	return `<figure data-rehype-pretty-code-figure class="home-code-block">${html}</figure>`;
}
