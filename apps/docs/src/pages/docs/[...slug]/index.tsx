import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { docsSource, type ContentEntry } from '@/lib/docs-source';
import { DocsLayout } from '@/layouts/docs-layout';
import { Banner } from '@/components/banner/banner';
import { CodeTabs } from '@/components/code-tabs';
import { ControllerContextVisualizer } from '@/components/controller-context-visualizer';
import { ControllerDecoratorVisualizer } from '@/components/controller-decorator-visualizer';
import { RadiantJsxCounter, RadiantElementCounter } from '@/components/radiant-counter';
import { RadiantTodoApp } from '@/components/radiant-todo-app';
import { WeatherApp } from '@/components/weather-app/weather-app';

export default eco.page<{ entry: ContentEntry }, JsxRenderable>({
	layout: DocsLayout,
	dependencies: {
		components: [
			Banner,
			CodeTabs,
			ControllerContextVisualizer,
			ControllerDecoratorVisualizer,
			RadiantJsxCounter,
			RadiantElementCounter,
			RadiantTodoApp,
			WeatherApp,
		],
	},
	staticPaths: async () => {
		const manifest = await docsSource.getManifest();

		return {
			paths: manifest.map((post) => ({
				params: {
					slug: post.segments,
				},
			})),
		};
	},
	staticProps: async ({ pathname }) => {
		const segments = Array.isArray(pathname.params.slug) ? pathname.params.slug : [pathname.params.slug];
		const entry = await docsSource.getContentEntryBySegments(segments);

		return {
			props: {
				entry,
			},
		};
	},
	metadata: ({ props: { entry } }) => ({
		title: `Docs | ${entry.title}`,
		description: entry.description,
	}),
	render: async ({ entry }) => {
		const Content = await docsSource.getContent(entry.slug);

		return (
			<section class="docs-page">
				<Content />
			</section>
		);
	},
});
