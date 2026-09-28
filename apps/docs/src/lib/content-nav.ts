import { DOCS_GROUP_ORDER_INDEX, DOCS_ROOT } from '@/content/docs';
import { entries } from 'ecopages:content/docs';

export type ContentNavItem = {
	title: string;
	href: string;
	slug: string;
};

export type ContentNavGroup = {
	name: string;
	items: ContentNavItem[];
};

export type ContentNav = {
	rootDir: string;
	groups: ContentNavGroup[];
};

/** Flatten grouped nav into document order for prev/next pagination. */
export function flattenContentNav(nav: ContentNav): ContentNavItem[] {
	return nav.groups.flatMap((group) => group.items);
}

export type NavigableContentEntry = {
	title: string;
	slug: string;
	segments: string[];
	group?: string;
};

export type BuildGroupedNavOptions = {
	rootDir: string;
	groupOrder?: ReadonlyMap<string, number>;
	/** Slug segment to exclude from nav items. Defaults to `index`. */
	excludeSegment?: string;
};

/**
 * Builds grouped navigation from a content manifest. Group order follows
 * `groupOrder` when provided; otherwise groups appear in first-seen order.
 */
export function buildGroupedNav<T extends NavigableContentEntry>(
	posts: readonly T[],
	{ rootDir, groupOrder, excludeSegment = 'index' }: BuildGroupedNavOptions,
): ContentNav {
	const byGroup = new Map<string, T[]>();
	const groupInsertion = new Map<string, number>();

	posts.forEach((post, index) => {
		if (post.segments[post.segments.length - 1] === excludeSegment) return;
		const group = post.group ?? post.segments[0] ?? 'Other';
		if (!byGroup.has(group)) {
			byGroup.set(group, []);
			groupInsertion.set(group, index);
		}
		byGroup.get(group)!.push(post);
	});

	const orderedGroups = Array.from(byGroup.keys()).sort((a, b) => {
		const ai = groupOrder?.get(a);
		const bi = groupOrder?.get(b);
		if (ai === undefined && bi === undefined) return (groupInsertion.get(a) ?? 0) - (groupInsertion.get(b) ?? 0);
		if (ai === undefined) return 1;
		if (bi === undefined) return -1;
		return ai - bi;
	});

	const groups: ContentNavGroup[] = orderedGroups.map((name) => ({
		name,
		items: (byGroup.get(name) ?? []).map((post) => ({
			title: post.title,
			href: `${rootDir}/${post.segments.join('/')}`,
			slug: post.slug,
		})),
	}));

	return { rootDir, groups };
}

export const docsNav = buildGroupedNav(entries, {
	rootDir: DOCS_ROOT,
	groupOrder: DOCS_GROUP_ORDER_INDEX,
});
