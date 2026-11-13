import { entries as contentComponentEntries } from 'ecopages:content/components';
import {
	compareDocsEntries,
	DOCS_ROOT,
	DOCS_SECTION_CONFIG,
	DOCS_SECTION_ORDER,
	type ComponentCategory,
	type ComponentSectionId,
} from '@/content/components';

const COMPONENT_SECTION_ORDER = DOCS_SECTION_ORDER.filter(
	(section): section is ComponentSectionId => section !== 'getting-started',
);

export const COMPONENT_CATEGORY_ORDER: ComponentCategory[] = COMPONENT_SECTION_ORDER.map(
	(section) => DOCS_SECTION_CONFIG[section].title,
);

function isComponentSection(section: string | undefined): section is ComponentSectionId {
	return COMPONENT_SECTION_ORDER.some((id) => id === section);
}

export const componentNavEntries = [...contentComponentEntries].sort(compareDocsEntries).flatMap((entry) => {
	const section = entry.segments[0];
	if (!isComponentSection(section)) return [];
	const slug = entry.segments[entry.segments.length - 1]!;

	return [
		{
			slug,
			title: entry.title,
			category: DOCS_SECTION_CONFIG[section].title,
			href: `${DOCS_ROOT}/${section}/${slug}`,
		},
	];
});

export function firstComponentHref(category: ComponentCategory): string {
	const entry = componentNavEntries.find((item) => item.category === category);
	return entry?.href ?? `${DOCS_ROOT}/actions/button`;
}

export const groupedComponentNavEntries = COMPONENT_CATEGORY_ORDER.map((category) => ({
	category,
	items: componentNavEntries.filter((entry) => entry.category === category),
})).filter((group) => group.items.length > 0);
