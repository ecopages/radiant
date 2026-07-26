import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect } from 'storybook/test';
import { RuiFeed } from './feed';

const meta = {
	title: 'Components/Feed',
	component: RuiFeed,
	args: {
		label: 'Timeline',
		articles: [
			{ id: '1', title: 'Hello radiant-ui', children: <p>First post in the feed.</p> },
			{ id: '2', title: 'APG patterns', children: <p>Building accessible widgets.</p> },
		],
	},
} satisfies Meta<typeof RuiFeed>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		await step('exposes role=feed with articles', async () => {
			await expect(canvasElement.querySelector('[role="feed"]')).toBeInTheDocument();
			await expect(canvasElement.querySelectorAll('article')).toHaveLength(2);
		});
	},
};
