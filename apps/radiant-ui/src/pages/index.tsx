import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { getComponent, getEntryDependencies } from 'ecopages:content/components/server';
import { CopyForLlm } from '@/components/copy-for-llm';
import { DocsLayout } from '@/layouts/docs-layout';

const introductionSlug = 'getting-started/introduction';

export default eco.page<{}, JsxRenderable>({
	layout: DocsLayout,
	dependencies: async () => {
		const entryDependencies = await getEntryDependencies(introductionSlug);
		return {
			...entryDependencies,
			components: [...(entryDependencies?.components ?? []), CopyForLlm],
		};
	},
	metadata: () => ({
		title: 'Docs | Introduction',
		description: 'An introduction to Radiant UI and its component documentation.',
	}),
	render: async () => {
		const Content = await getComponent(introductionSlug);

		return (
			<section class="docs-page">
				<div class="docs-bar unstyled">
					<CopyForLlm llmUrl={`/llms-content/${introductionSlug}.txt`} />
				</div>
				<Content />
			</section>
		);
	},
});
