import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import {
	RuiBreadcrumb,
	RuiBreadcrumbItem,
	RuiBreadcrumbLink,
	RuiBreadcrumbList,
	RuiBreadcrumbPage,
	RuiBreadcrumbSeparator,
} from '@ecopages/radiant-ui/breadcrumb';
import { entries, getEntryBySegments } from 'ecopages:content/components';
import { getComponent, getEntryDependencies } from 'ecopages:content/components/server';
import type { Entry } from 'ecopages:content/components';
import { DocsLayout } from '@/layouts/docs-layout';
import { docsNav } from '@/lib/content-nav';
import { getDocsLlmUrl } from '@/lib/docs/docs-llm-url';
import { CopyForLlm } from '@/components/copy-for-llm';

const DocsBreadcrumb = ({ entry }: { entry: Entry }) => {
	const group = docsNav.groups.find((navGroup) => navGroup.items.some((item) => item.slug === entry.slug));
	const groupLink = group?.items[0];

	return (
		<div class="unstyled">
			<RuiBreadcrumb label="Page location">
				<RuiBreadcrumbList>
					<RuiBreadcrumbItem>
						<RuiBreadcrumbLink href="/">Home</RuiBreadcrumbLink>
					</RuiBreadcrumbItem>
					<RuiBreadcrumbSeparator />
					<RuiBreadcrumbItem>
						<RuiBreadcrumbLink href="/docs/getting-started/introduction">Docs</RuiBreadcrumbLink>
					</RuiBreadcrumbItem>
					{group && groupLink ? (
						<>
							<RuiBreadcrumbSeparator />
							<RuiBreadcrumbItem>
								<RuiBreadcrumbLink href={groupLink.href}>{group.name}</RuiBreadcrumbLink>
							</RuiBreadcrumbItem>
						</>
					) : null}
					<RuiBreadcrumbSeparator />
					<RuiBreadcrumbItem>
						<RuiBreadcrumbPage>{entry.title}</RuiBreadcrumbPage>
					</RuiBreadcrumbItem>
				</RuiBreadcrumbList>
			</RuiBreadcrumb>
		</div>
	);
};

export default eco.page<{ entry: Entry }, JsxRenderable>({
	layout: DocsLayout,
	dependencies: async ({ props }) => {
		const entryDependencies = await getEntryDependencies(props.entry.slug);
		return {
			...entryDependencies,
			components: [...(entryDependencies?.components ?? []), CopyForLlm],
		};
	},
	staticPaths: async () => ({
		paths: entries.map((post) => ({
			params: {
				slug: post.segments,
			},
		})),
	}),
	staticProps: async ({ pathname }) => {
		const segments = Array.isArray(pathname.params.slug) ? pathname.params.slug : [pathname.params.slug];
		const entry = getEntryBySegments(segments);

		return {
			props: {
				entry,
			},
		};
	},
	metadata: ({ props: { entry } }) => ({
		title: `Docs | ${entry.title}`,
		description: entry.description,
		url: `/docs/${entry.slug}`,
	}),
	render: async ({ entry }) => {
		const Content = await getComponent(entry.slug);
		const llmUrl = getDocsLlmUrl(entry.slug);

		return (
			<section class="docs-page">
				<div class="docs-bar unstyled">
					<DocsBreadcrumb entry={entry} />
					<CopyForLlm llmUrl={llmUrl} />
				</div>
				<Content />
			</section>
		);
	},
});
