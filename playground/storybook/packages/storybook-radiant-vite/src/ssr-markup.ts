/**
 * Pure SSR markup helpers shared by the browser mount path and the Node
 * middleware. This module must stay free of Node-only imports so the preview
 * bundle never pulls in `@ecopages/jsx/server`.
 */

export function storyIdToExportName(storyId: string): string | undefined {
	const suffix = storyId.split('--').pop();
	if (!suffix) {
		return undefined;
	}

	return suffix.replace(/(^|-)([a-z])/g, (_, __, char: string) => char.toUpperCase());
}

export function extractHostInnerHtml(markup: string, tagName: string): string | undefined {
	const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
	const match = markup.match(pattern);
	return match?.[1];
}

export function isEmptyHostShell(markup: string, tagName: string): boolean {
	const trimmed = markup.trim();
	const pattern = new RegExp(`^<${tagName}\\b[^>]*>\\s*</${tagName}>$`, 'i');
	return pattern.test(trimmed);
}
