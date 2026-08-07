import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { entries, getEntryBySegments } from 'ecopages:content/components';
import { getComponent, getEntryDependencies } from 'ecopages:content/components/server';
import type { Entry } from 'ecopages:content/components';
import DocsBreadcrumb from '@/components/docs-breadcrumb/docs-breadcrumb';
import { DocsLayout } from '@/layouts/docs-layout';
import { buildComponentDocsBreadcrumb } from '@/lib/docs-breadcrumb';

export default eco.page<{ entry: Entry }, JsxRenderable>({
	layout: DocsLayout,
	dependencies: ({ props }) => {
		const entryDeps = getEntryDependencies(props.entry.slug);
		return {
			...entryDeps,
			components: [...(entryDeps.components ?? []), DocsBreadcrumb],
		};
	},
	staticPaths: async () => ({
		paths: entries.map((entry) => ({ params: { slug: entry.segments } })),
	}),
	staticProps: async ({ pathname }) => {
		const slug = Array.isArray(pathname.params.slug) ? pathname.params.slug : [pathname.params.slug];
		return { props: { entry: getEntryBySegments(slug) } };
	},
	metadata: ({ props: { entry } }) => ({ title: `${entry.title} | Radiant UI`, description: entry.description }),
	render: async ({ entry }) => {
		const Content = getComponent(entry.slug);
		return (
			<>
				<DocsBreadcrumb items={buildComponentDocsBreadcrumb(entry.category, entry.title)} />
				<Content />
			</>
		);
	},
});
