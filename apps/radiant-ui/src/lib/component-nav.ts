import { entries as contentComponentEntries } from 'ecopages:content/components';
import type { ComponentCategory } from '@/lib/playground';

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

export const componentNavEntries = contentComponentEntries.map((entry) => ({
	slug: entry.slug,
	title: entry.title,
	category: entry.category,
}));

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

export type DocsNavItem = {
	title: string;
	href: string;
};

/** Flatten sidebar nav into document order for prev/next pagination. */
export function flattenDocsNav(): DocsNavItem[] {
	const groups = buildComponentNav();
	return [
		{ title: 'Home', href: '/' },
		{ title: 'Introduction', href: '/docs/introduction' },
		...groups.flatMap((group) => group.items),
	];
}

/** Adjacent items for `pathname`, or `null` when the path is not in the list. */
export function getAdjacentDocsNavItems(
	pathname: string,
	items: readonly DocsNavItem[] = flattenDocsNav(),
): { prev: DocsNavItem | null; next: DocsNavItem | null } | null {
	const currentIndex = items.findIndex((item) => item.href === pathname);
	if (currentIndex === -1) {
		return null;
	}

	return {
		prev: currentIndex > 0 ? items[currentIndex - 1]! : null,
		next: currentIndex < items.length - 1 ? items[currentIndex + 1]! : null,
	};
}
