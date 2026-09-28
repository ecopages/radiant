import { entries as contentComponentEntries } from 'ecopages:content/components';
import type { ComponentCategory } from '@/content/components';

export const COMPONENT_CATEGORY_ORDER: ComponentCategory[] = [
	'Actions',
	'Forms',
	'Layout',
	'Navigation',
	'Overlays',
	'Feedback',
	'Data display',
];

export const componentNavEntries = contentComponentEntries
	.filter((entry) => entry.category)
	.map((entry) => ({
		slug: entry.slug,
		title: entry.title,
		category: entry.category as ComponentCategory,
		href: `/docs/${entry.segments.join('/')}`,
	}));

export function firstComponentHref(category: ComponentCategory): string {
	const entry = componentNavEntries.find((item) => item.category === category);
	return entry?.href ?? '/docs/button';
}

export const groupedComponentNavEntries = COMPONENT_CATEGORY_ORDER.map((category) => ({
	category,
	items: componentNavEntries.filter((entry) => entry.category === category),
})).filter((group) => group.items.length > 0);
