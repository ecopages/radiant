import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { entries, getEntryBySegments } from 'ecopages:content/components';
import { getComponent, getEntryDependencies } from 'ecopages:content/components/server';
import type { Entry } from 'ecopages:content/components';
import { DocsLayout } from '@/layouts/docs-layout';
import { DOCS_ROOT } from '@/content/components';
import { getDocsLlmUrl } from '@/lib/docs/docs-llm-url';
import { CopyForLlm } from '@/components/copy-for-llm';
import { DocsBreadcrumb } from '@/components/docs-breadcrumb';

/**
 * @remarks
 * Returns `undefined` for an empty slug so the layout renders no pagination
 * instead of matching a `/docs/` href that no nav item has.
 */
function docsHref(slug: string | string[] | undefined): string | undefined {
	const segments = [slug ?? []].flat().filter(Boolean);
	return segments.length > 0 ? `${DOCS_ROOT}/${segments.join('/')}` : undefined;
}

export default eco.page<{ entry: Entry }, JsxRenderable>({
	layout: {
		component: DocsLayout,
		props: ({ params }) => ({ currentHref: docsHref(params?.slug) }),
	},
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
