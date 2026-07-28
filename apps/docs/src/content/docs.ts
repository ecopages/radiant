import { z } from 'zod';

/** Public URL prefix for docs pages. */
export const DOCS_ROOT = '/docs';

/** Sidebar group order (frontmatter `group` values). */
export const DOCS_GROUP_ORDER = [
	'Getting Started',
	'Components',
	'Tools',
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

export const docsFrontmatterSchema = z.object({
	title: z.string(),
	description: z.string(),
	group: z.string().optional(),
	order: z.coerce.number().optional(),
});

export type DocsFrontmatter = z.infer<typeof docsFrontmatterSchema>;
