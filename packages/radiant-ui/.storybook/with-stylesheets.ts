import type { Decorator } from '@ecopages/storybook-radiant-vite';

const STYLESHEET_ATTR = 'data-storybook-stylesheet';

/** Resolved Vite `?url` href or `{ inline: string }` from `?inline`. */
export type StylesheetEntry = string | { inline: string };

const activeNodes: HTMLElement[] = [];

function isInlineEntry(entry: StylesheetEntry): entry is { inline: string } {
	return typeof entry === 'object' && entry !== null && 'inline' in entry;
}

function clearActiveStylesheets(): void {
	for (const node of activeNodes) {
		node.remove();
	}
	activeNodes.length = 0;
}

function injectStylesheets(entries: StylesheetEntry[], head: HTMLHeadElement): HTMLElement[] {
	const nodes: HTMLElement[] = [];

	for (const entry of entries) {
		if (isInlineEntry(entry)) {
			const style = document.createElement('style');
			style.setAttribute(STYLESHEET_ATTR, '');
			style.textContent = entry.inline;
			head.appendChild(style);
			nodes.push(style);
			continue;
		}

		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = entry;
		link.setAttribute(STYLESHEET_ATTR, '');
		head.appendChild(link);
		nodes.push(link);
	}

	return nodes;
}

/** Spread into story `parameters` to inject supplemental CSS via the preview decorator. */
export function withStylesheets(stylesheets: StylesheetEntry[]): { stylesheets: StylesheetEntry[] } {
	return { stylesheets };
}

/**
 * Injects `parameters.stylesheets` into `document.head` for the active story.
 * Clears any stylesheets injected for the previous story before applying the next set.
 *
 * @remarks
 * Base component CSS is declared via `radiantMeta(meta, { stylesheets })` in story files
 * and reintroduced as side-effect imports by the Storybook stamp transform. Use this
 * decorator only for skins and other story-scoped extras.
 */
export const withStylesheetsDecorator: Decorator = (Story, context) => {
	clearActiveStylesheets();

	const entries = context.parameters.stylesheets as StylesheetEntry[] | undefined;
	if (entries?.length) {
		activeNodes.push(...injectStylesheets(entries, document.head));
	}

	return Story();
};
