import type { Decorator } from '@ecopages/storybook-radiant-vite';

const STYLESHEET_ATTR = 'data-storybook-stylesheet';

/** Resolved Vite `?url` href or `{ inline: string }` from `?inline`. */
export type StylesheetEntry = string | { inline: string };

function isInlineEntry(entry: StylesheetEntry): entry is { inline: string } {
	return typeof entry === 'object' && entry !== null && 'inline' in entry;
}

function createNode(entry: StylesheetEntry): HTMLElement {
	if (isInlineEntry(entry)) {
		const style = document.createElement('style');
		style.textContent = entry.inline;
		style.setAttribute(STYLESHEET_ATTR, '');
		return style;
	}

	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = entry;
	link.setAttribute(STYLESHEET_ATTR, '');
	return link;
}

/**
 * Loads supplemental stylesheets for the stories it decorates.
 *
 * @remarks
 * Apply per story: `decorators: [withStylesheets([skinCss])]`. Use it only for skins and other
 * story-scoped extras — a component's own CSS is declared with `parameters.radiant.cssImports`
 * and becomes a build-time side-effect import.
 *
 * Cleanup is not done here. {@link clearStylesheetsDecorator} runs for every story and clears
 * first, so several of these compose without clobbering each other, and switching to a story
 * that never calls this decorator still drops the previous skin.
 *
 * The SSR story path also runs story decorators on the server, where Radiant's minimal document
 * has no `head`, so without one this only renders the story. The static SSR preview links a `?url`
 * stylesheet the story module imports from the module graph, and the hydrated preview runs this
 * decorator again in the browser. The check is on `document.head`, not `isServer`: Storybook's
 * Vite SSR resolves `@ecopages/radiant/is-server` to its browser build.
 */
export function withStylesheets(entries: StylesheetEntry[]): Decorator {
	return (Story) => {
		if (!globalThis.document?.head) {
			return Story();
		}
		for (const entry of entries) {
			document.head.appendChild(createNode(entry));
		}
		return Story();
	};
}

/**
 * Removes stylesheets injected by {@link withStylesheets} for the previous story.
 *
 * @remarks
 * Registered globally in `preview.ts`, and it has to stay global: project decorators wrap
 * story decorators, so this clears before any `withStylesheets` injects, and it still runs for
 * stories that declare no stylesheets at all.
 *
 * The `data-storybook-stylesheet` attribute is the only handle needed — tracking the nodes in a
 * module-level array would be a second source of truth for the same set.
 */
export const clearStylesheetsDecorator: Decorator = (Story) => {
	for (const node of document.head.querySelectorAll(`[${STYLESHEET_ATTR}]`)) {
		node.remove();
	}
	return Story();
};
