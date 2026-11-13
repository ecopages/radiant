import type { JsxRenderable } from '@ecopages/jsx';
import { entries } from 'ecopages:content/docs';
import {
	compareDocsEntries,
	DOCS_ROOT,
	DOCS_SECTION_CONFIG,
	DOCS_SECTION_ORDER,
	type DocsSectionId,
} from '@/content/docs';

export type DocsNavItem = {
	title: string;
	description: string;
	href: string;
	section: string;
	slug: string;
};

export type DocsNavSection = {
	id: string;
	title: string;
	icon: JsxRenderable;
	items: DocsNavItem[];
};

export type DocsNav = {
	rootDir: string;
	sections: DocsNavSection[];
};

/**
 * Section landing pages (`context/index.mdx`, `decorators/index.mdx`) are served at `/docs/<section>` and left out of
 * the sidebar and pagination.
 */
const NAV_EXCLUDED_SEGMENT = 'index';

/** Flatten the sectioned nav into document order for prev/next pagination. */
export function flattenContentNav(nav: DocsNav): DocsNavItem[] {
	return nav.sections.flatMap((section) => section.items);
}

export type AdjacentNavLink = {
	href: string;
	title: string;
};

export function findAdjacentNavItems<T extends AdjacentNavLink>(
	items: readonly T[],
	href: string,
): { prev: T | null; next: T | null } | null {
	const currentIndex = items.findIndex((item) => item.href === href);
	if (currentIndex === -1) {
		return null;
	}

	return {
		prev: currentIndex > 0 ? items[currentIndex - 1]! : null,
		next: currentIndex < items.length - 1 ? items[currentIndex + 1]! : null,
	};
}

const itemsBySection = new Map<string, DocsNavItem[]>();

for (const entry of [...entries].sort(compareDocsEntries)) {
	const sectionId = entry.segments[0]!;
	const pageSlug = entry.segments[entry.segments.length - 1]!;
	if (pageSlug === NAV_EXCLUDED_SEGMENT) continue;
	const items = itemsBySection.get(sectionId) ?? [];

	items.push({
		title: entry.title,
		description: entry.description,
		href: `${DOCS_ROOT}/${sectionId}/${pageSlug}`,
		section: sectionId,
		slug: pageSlug,
	});
	itemsBySection.set(sectionId, items);
}

export const docsNav: DocsNav = {
	rootDir: DOCS_ROOT,
	sections: DOCS_SECTION_ORDER.flatMap((sectionId) => {
		const items = itemsBySection.get(sectionId);
		if (!items || items.length === 0) {
			return [];
		}

		const config = DOCS_SECTION_CONFIG[sectionId as DocsSectionId];

		return [
			{
				id: sectionId,
				title: config.title,
				icon: config.icon,
				items,
			},
		];
	}),
};
