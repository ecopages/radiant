import type { ContentEntry } from '@ecopages/content-processor/types';
import type { JsxRenderable } from '@ecopages/jsx';
import { z } from 'zod';
import {
	componentsIcon,
	contextIcon,
	decoratorsIcon,
	examplesIcon,
	gettingStartedIcon,
	helpersIcon,
	jsxIcon,
	signalsIcon,
	ssrIcon,
	toolsIcon,
} from './section-icons';

/** Public URL prefix for docs pages. */
export const DOCS_ROOT = '/docs';

/** Sidebar section order. A section is the first path segment under `content/docs`. */
export const DOCS_SECTION_ORDER = [
	'getting-started',
	'components',
	'tools',
	'decorators',
	'jsx',
	'signals',
	'context',
	'helpers',
	'examples',
	'ssr',
] as const;

export type DocsSectionId = (typeof DOCS_SECTION_ORDER)[number];

export const DOCS_SECTION_ORDER_INDEX = new Map<string, number>(
	DOCS_SECTION_ORDER.map((section, index) => [section, index]),
);

export const LLM_SECTION_ORDER = [...DOCS_SECTION_ORDER] as const;

export const DOCS_SECTION_CONFIG: Record<
	DocsSectionId,
	{
		title: string;
		icon: JsxRenderable;
	}
> = {
	'getting-started': { title: 'Getting Started', icon: gettingStartedIcon },
	components: { title: 'Components', icon: componentsIcon },
	tools: { title: 'Tools', icon: toolsIcon },
	decorators: { title: 'Decorators', icon: decoratorsIcon },
	jsx: { title: 'JSX', icon: jsxIcon },
	signals: { title: 'Signals', icon: signalsIcon },
	context: { title: 'Context', icon: contextIcon },
	helpers: { title: 'Helpers', icon: helpersIcon },
	examples: { title: 'Examples', icon: examplesIcon },
	ssr: { title: 'SSR', icon: ssrIcon },
};

export const docsFrontmatterSchema = z.object({
	title: z.string(),
	description: z.string(),
	order: z.coerce.number().optional(),
});

export type DocsFrontmatter = z.infer<typeof docsFrontmatterSchema>;

export type DocsContentEntry = ContentEntry<DocsFrontmatter>;

/**
 * Sorts entries by configured section order, then frontmatter `order`, then slug.
 *
 * @remarks
 * The slug tie-break keeps pages without `order` (or with equal values) in a stable alphabetical order, so `button`
 * stays ahead of `button-group` regardless of how the scanner lists files.
 */
export function compareDocsEntries(a: DocsContentEntry, b: DocsContentEntry): number {
	const sectionA = DOCS_SECTION_ORDER_INDEX.get(a.segments[0] ?? '') ?? Number.MAX_SAFE_INTEGER;
	const sectionB = DOCS_SECTION_ORDER_INDEX.get(b.segments[0] ?? '') ?? Number.MAX_SAFE_INTEGER;

	if (sectionA !== sectionB) {
		return sectionA - sectionB;
	}

	return (a.order ?? 0) - (b.order ?? 0) || a.slug.localeCompare(b.slug);
}
