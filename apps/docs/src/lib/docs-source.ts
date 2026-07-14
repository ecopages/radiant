import { join } from 'node:path';
import { ContentSource } from './content-source/content-source';
import { resolveAppRoot } from './resolve-app-root';

const appRoot = resolveAppRoot(import.meta.url);

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

export const docsContentRoot = join(appRoot, 'src/content/docs');

export const docsSource = new ContentSource({
	contentRoot: docsContentRoot,
	orderBy: 'order',
});

export type { ContentEntry, ContentFrontmatter } from './content-source/content-source';
