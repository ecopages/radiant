import type { EcoPagesAppConfig } from '@ecopages/core';
import { ContentSource, resolveContentRoot } from '@/lib/content-source';

/** Public URL prefix for docs pages. */
export const DOCS_ROOT = '/docs';

/** Sidebar group order (frontmatter `group` values). */
export const DOCS_GROUP_ORDER = [
	'Getting Started',
	'Components',
	'Decorators',
	'JSX',
	'Signals',
	'Context',
	'Helpers',
	'Examples',
] as const;

export const DOCS_GROUP_ORDER_INDEX = new Map<string, number>(DOCS_GROUP_ORDER.map((name, index) => [name, index]));

/** Preferred section order for `llms.txt` (first slug segment). */
export const LLM_SECTION_ORDER = [
	'getting-started',
	'components',
	'decorators',
	'context',
	'packages',
	'examples',
	'tools',
] as const;

let docsContentSource: ContentSource | undefined;

/** Wires the content library to this app's ecopages config. */
export function getDocsContentSource(appConfig: EcoPagesAppConfig): ContentSource {
	if (!docsContentSource) {
		docsContentSource = new ContentSource({
			contentRoot: resolveContentRoot(appConfig),
			orderBy: 'order',
		});
	}
	return docsContentSource;
}

/**
 * Returns the source initialized during `staticPaths`. Layout render runs
 * after static path generation, so the instance is already available.
 */
export function getInitializedDocsContentSource(): ContentSource {
	if (!docsContentSource) {
		throw new Error('Docs content source is not initialized. Call getDocsContentSource(appConfig) in staticPaths first.');
	}
	return docsContentSource;
}
