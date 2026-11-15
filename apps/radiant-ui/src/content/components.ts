import type { ContentEntry } from '@ecopages/content-processor/types';
import type { JsxRenderable } from '@ecopages/jsx';
import { z } from 'zod';
import {
	actionsIcon,
	controllersIcon,
	dataDisplayIcon,
	feedbackIcon,
	formsIcon,
	gettingStartedIcon,
	helpersIcon,
	layoutIcon,
	navigationIcon,
	overlaysIcon,
	recipesIcon,
} from './section-icons';

/** Public URL prefix for docs pages. */
export const DOCS_ROOT = '/docs';

/** Sidebar section order. A section is the first path segment under `content/components`. */
export const DOCS_SECTION_ORDER = [
	'getting-started',
	'actions',
	'forms',
	'layout',
	'navigation',
	'overlays',
	'feedback',
	'data-display',
	'controllers',
	'helpers',
	'recipes',
] as const;

export type DocsSectionId = (typeof DOCS_SECTION_ORDER)[number];

export const DOCS_SECTION_ORDER_INDEX = new Map<string, number>(
	DOCS_SECTION_ORDER.map((section, index) => [section, index]),
);

export const LLM_SECTION_ORDER = [...DOCS_SECTION_ORDER] as const;

export const DOCS_SECTION_CONFIG = {
	'getting-started': { title: 'Getting started', icon: gettingStartedIcon },
	actions: { title: 'Actions', icon: actionsIcon },
	forms: { title: 'Forms', icon: formsIcon },
	layout: { title: 'Layout', icon: layoutIcon },
	navigation: { title: 'Navigation', icon: navigationIcon },
	overlays: { title: 'Overlays', icon: overlaysIcon },
	feedback: { title: 'Feedback', icon: feedbackIcon },
	'data-display': { title: 'Data display', icon: dataDisplayIcon },
	controllers: { title: 'Controllers', icon: controllersIcon },
	helpers: { title: 'Helpers', icon: helpersIcon },
	recipes: { title: 'Recipes', icon: recipesIcon },
} as const satisfies Record<DocsSectionId, { title: string; icon: JsxRenderable }>;

/** Sections that are not catalog components: the guide and the primitives components are built from. */
export const NON_COMPONENT_SECTIONS = ['getting-started', 'controllers', 'helpers', 'recipes'] as const;

/** Sections that list catalog components. */
export type ComponentSectionId = Exclude<DocsSectionId, (typeof NON_COMPONENT_SECTIONS)[number]>;

export type ComponentCategory = (typeof DOCS_SECTION_CONFIG)[ComponentSectionId]['title'];

export const componentDocsFrontmatterSchema = z.object({
	title: z.string(),
	description: z.string(),
	order: z.coerce.number().optional(),
	/** Set to `false` to leave the page out of `llms.txt` and the Markdown exports. */
	llms: z.boolean().optional(),
});

export type ComponentDocsFrontmatter = z.infer<typeof componentDocsFrontmatterSchema>;

export type ComponentDocsContentEntry = ContentEntry<ComponentDocsFrontmatter>;

/**
 * Sorts entries by configured section order, then frontmatter `order`, then slug.
 *
 * @remarks
 * The slug tie-break keeps pages without `order` (or with equal values) in a stable alphabetical order, so `button`
 * stays ahead of `button-group` regardless of how the scanner lists files.
 */
export function compareDocsEntries(a: ComponentDocsContentEntry, b: ComponentDocsContentEntry): number {
	const sectionA = DOCS_SECTION_ORDER_INDEX.get(a.segments[0] ?? '') ?? Number.MAX_SAFE_INTEGER;
	const sectionB = DOCS_SECTION_ORDER_INDEX.get(b.segments[0] ?? '') ?? Number.MAX_SAFE_INTEGER;

	if (sectionA !== sectionB) {
		return sectionA - sectionB;
	}

	return (a.order ?? 0) - (b.order ?? 0) || a.slug.localeCompare(b.slug);
}
