import { DOCS_GROUP_ORDER_INDEX, DOCS_ROOT, getInitializedDocsContentSource } from '@/config/docs';
import type { ContentEntry } from '@/lib/content-source';

export type DocsNavItem = {
	title: string;
	href: string;
	slug: string;
};

export type DocsNavGroup = {
	name: string;
	items: DocsNavItem[];
};

export type DocsNav = {
	rootDir: string;
	groups: DocsNavGroup[];
};

/**
 * Builds the grouped sidebar navigation driven entirely by the content
 * manifest. Group order follows `DOCS_GROUP_ORDER`; items within a group
 * follow the manifest's configured ordering.
 */
export async function getDocsNav(rootDir = DOCS_ROOT): Promise<DocsNav> {
	const posts = await getInitializedDocsContentSource().getManifest();

	const byGroup = new Map<string, ContentEntry[]>();
	const groupInsertion = new Map<string, number>();

	posts.forEach((post, index) => {
		if (post.segments[post.segments.length - 1] === 'index') return;
		const group = post.group ?? post.segments[0] ?? 'Other';
		if (!byGroup.has(group)) {
			byGroup.set(group, []);
			groupInsertion.set(group, index);
		}
		byGroup.get(group)!.push(post);
	});

	const orderedGroups = Array.from(byGroup.keys()).sort((a, b) => {
		const ai = DOCS_GROUP_ORDER_INDEX.get(a);
		const bi = DOCS_GROUP_ORDER_INDEX.get(b);
		if (ai === undefined && bi === undefined) return (groupInsertion.get(a) ?? 0) - (groupInsertion.get(b) ?? 0);
		if (ai === undefined) return 1;
		if (bi === undefined) return -1;
		return ai - bi;
	});

	const groups: DocsNavGroup[] = orderedGroups.map((name) => ({
		name,
		items: (byGroup.get(name) ?? []).map((post) => ({
			title: post.title,
			href: `${rootDir}/${post.segments.join('/')}`,
			slug: post.slug,
		})),
	}));

	return { rootDir, groups };
}
