import type { Decorator } from '@ecopages/storybook-radiant-vite';

const STYLESHEET_ATTR = 'data-storybook-stylesheet';

/** Resolved Vite `?url` href or `{ inline: string }` from `?inline`. */
export type StylesheetEntry = string | { inline: string };

const injected: HTMLElement[] = [];

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
 */
export function withStylesheets(entries: StylesheetEntry[]): Decorator {
	return (Story) => {
		for (const entry of entries) {
			injected.push(document.head.appendChild(createNode(entry)));
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
 */
export const clearStylesheetsDecorator: Decorator = (Story) => {
	for (const node of injected) {
		node.remove();
	}
	injected.length = 0;
	return Story();
};
