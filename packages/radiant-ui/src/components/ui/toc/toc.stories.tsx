import type { Decorator, Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import type { JsxRenderable } from '@ecopages/jsx';
import { expect } from 'storybook/test';
import { RuiToc } from './toc';
import { RuiToc as RuiTocElement } from './toc.script';

const Article = () => (
	<article class="toc-story-article min-w-0 pb-48">
		<section class="min-h-56 scroll-mt-20">
			<h2 id="overview" class="text-xl font-semibold">
				Overview
			</h2>
			<p class="mt-3 max-w-prose text-sm text-on-surface">First section content.</p>
		</section>
		<section class="min-h-56 scroll-mt-20 border-t border-border pt-8">
			<h2 id="configuration" class="text-xl font-semibold">
				Configuration
			</h2>
			<p class="mt-3 max-w-prose text-sm text-on-surface">Second section content.</p>
			<h3 id="tokens" class="mt-10 text-base font-semibold">
				Design tokens
			</h3>
			<p class="mt-3 max-w-prose text-sm text-on-surface">Nested section content.</p>
		</section>
		<section class="min-h-56 scroll-mt-20 border-t border-border pt-8">
			<h2 id="next-steps" class="text-xl font-semibold">
				Next steps
			</h2>
			<p class="mt-3 max-w-prose text-sm text-on-surface">Final section content.</p>
		</section>
	</article>
);

const withTocArticle: Decorator = (Story) => (
	<section class="h-[30rem] overflow-y-auto rounded-lg bg-background p-5" data-toc-story-scroll-root>
		<div class="grid gap-8 md:grid-cols-[10rem_minmax(0,1fr)]">
			<aside class="sticky top-0 z-10 self-start bg-background py-1">{Story() as JsxRenderable}</aside>
			<Article />
		</div>
	</section>
);

const meta = {
	title: 'Components/Table of contents',
	component: RuiToc,
	parameters: { radiant: { element: RuiTocElement, cssImports: ['./toc.css'] } },
	decorators: [withTocArticle],
	args: {
		target: '.toc-story-article',
		label: 'On this page',
		headingSelector: 'h2,h3',
		scrollOffset: 80,
	},
	render: (args) => <RuiToc {...args} />,
} satisfies Meta<typeof RuiToc>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const root = canvasElement.querySelector('rui-toc');
		const scrollRoot = canvasElement.querySelector('[data-toc-story-scroll-root]');
		await step('provides a scrollable article context', async () => {
			await expect(scrollRoot).toBeInTheDocument();
			await expect(canvasElement.querySelector('.toc-story-article')).toBeInTheDocument();
		});
		await step('builds links for headings', async () => {
			await expect(root?.querySelectorAll('.rui-toc__link').length).toBe(4);
		});
	},
};
