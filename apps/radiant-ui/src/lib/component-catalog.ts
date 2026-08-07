import { componentNavEntries } from '@/lib/component-docs/nav-registry';

export type ComponentCatalogEntry = {
	slug: string;
	title: string;
};

export const componentCatalog: ComponentCatalogEntry[] = componentNavEntries.map((entry) => ({
	slug: entry.slug,
	title: entry.title,
}));

export function getComponentCatalogEntry(slug: string): ComponentCatalogEntry | undefined {
	return componentCatalog.find((entry) => entry.slug === slug);
}
