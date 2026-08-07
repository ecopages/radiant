import type { ComponentCategory } from '@/lib/playground';
import { componentNavEntries } from '@/lib/component-docs/nav-registry';

export const COMPONENT_CATEGORY_ORDER: ComponentCategory[] = [
	'Actions',
	'Forms',
	'Layout',
	'Navigation',
	'Overlays',
	'Feedback',
	'Data display',
];

export type ComponentNavGroup = {
	name: ComponentCategory;
	items: { slug: string; title: string; href: string }[];
};

export function buildComponentNav(): ComponentNavGroup[] {
	const byCategory = new Map<ComponentCategory, ComponentNavGroup['items']>();

	for (const entry of componentNavEntries) {
		const items = byCategory.get(entry.category) ?? [];
		items.push({ slug: entry.slug, title: entry.title, href: `/components/${entry.slug}` });
		byCategory.set(entry.category, items);
	}

	return COMPONENT_CATEGORY_ORDER.filter((name) => byCategory.has(name)).map((name) => ({
		name,
		items: (byCategory.get(name) ?? []).sort((a, b) => a.title.localeCompare(b.title)),
	}));
}

export function getAdjacentComponents(slug: string): {
	prev?: { title: string; href: string };
	next?: { title: string; href: string };
} {
	const flat = componentNavEntries
		.map((entry) => ({ title: entry.title, href: `/components/${entry.slug}` }))
		.sort((a, b) => a.title.localeCompare(b.title));
	const index = flat.findIndex((item) => item.href === `/components/${slug}`);
	if (index < 0) return {};
	return {
		prev: index > 0 ? flat[index - 1] : undefined,
		next: index < flat.length - 1 ? flat[index + 1] : undefined,
	};
}
