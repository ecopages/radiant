import { z } from 'zod';

export type ComponentCategory =
	'Actions' | 'Forms' | 'Layout' | 'Navigation' | 'Overlays' | 'Feedback' | 'Data display';

/** Public URL prefix for docs pages. */
export const DOCS_ROOT = '/docs';

/** Sidebar group order (frontmatter `group` or `category` values). */
export const DOCS_GROUP_ORDER = [
	'Getting started',
	'Actions',
	'Forms',
	'Layout',
	'Navigation',
	'Overlays',
	'Feedback',
	'Data display',
] as const;

export const DOCS_GROUP_ORDER_INDEX = new Map<string, number>(DOCS_GROUP_ORDER.map((name, index) => [name, index]));

const componentCategories = [
	'Actions',
	'Forms',
	'Layout',
	'Navigation',
	'Overlays',
	'Feedback',
	'Data display',
] as const satisfies readonly ComponentCategory[];

export const componentDocsFrontmatterSchema = z.object({
	title: z.string(),
	description: z.string(),
	category: z.enum(componentCategories).optional(),
	group: z.string().optional(),
});

export type ComponentDocsFrontmatter = z.infer<typeof componentDocsFrontmatterSchema>;
