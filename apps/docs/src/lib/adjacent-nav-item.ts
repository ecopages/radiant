export type AdjacentNavLink = {
	href: string;
	title: string;
};

/**
 * @remarks Dependency-free by design: `docs-pagination.script.tsx` runs client-side and cannot
 * import `@/lib/content-nav` there, since that module's top-level `buildGroupedNav(entries, ...)`
 * call pulls in the server-only `ecopages:content/docs` virtual module as a side effect.
 */
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
