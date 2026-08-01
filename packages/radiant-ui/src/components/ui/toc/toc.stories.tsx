import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect } from 'storybook/test';
import { RuiToc } from './toc';

const Article = () => (
	<article class="toc-story-article">
		<h2 id="overview">Overview</h2>
		<p>First section content.</p>
		<h2 id="configuration">Configuration</h2>
		<p>Second section content.</p>
		<h3 id="tokens">Design tokens</h3>
		<p>Nested section content.</p>
		<h2 id="next-steps">Next steps</h2>
		<p>Final section content.</p>
	</article>
);

const meta = {
	title: 'Components/Table of contents',
	component: RuiToc,
	args: {
		target: '.toc-story-article',
		label: 'On this page',
		headingSelector: 'h2,h3',
		scrollOffset: 80,
	},
	render: (args) => (
		<div class="toc-story-layout">
			<RuiToc {...args} />
			<Article />
		</div>
	),
} satisfies Meta<typeof RuiToc>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const root = canvasElement.querySelector('rui-toc');
		await step('builds links for headings', async () => {
			await expect(root?.querySelectorAll('.rui-toc__link').length).toBe(4);
		});
	},
};
