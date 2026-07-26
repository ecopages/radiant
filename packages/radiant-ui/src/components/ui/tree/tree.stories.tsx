import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiTree } from './tree';

const meta = {
	title: 'Components/Tree',
	component: RuiTree,
	args: {
		label: 'File explorer',
		nodes: [
			{
				id: 'src',
				label: 'src',
				expanded: true,
				children: [
					{ id: 'index', label: 'index.ts' },
					{ id: 'app', label: 'app.ts' },
				],
			},
			{ id: 'readme', label: 'README.md' },
		],
	},
} satisfies Meta<typeof RuiTree>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-tree') as HTMLElement;
		const items = Array.from(canvasElement.querySelectorAll('[role="treeitem"]')) as HTMLElement[];

		await step('ArrowDown moves to the next visible item', async () => {
			items[0].focus();
			await userEvent.keyboard('{ArrowDown}');
			await expect(document.activeElement).toBe(items[1]);
		});

		await step('selecting an item updates value and aria-selected', async () => {
			await userEvent.click(items[1]);
			await expect(host).toHaveAttribute('value', 'index');
			await expect(items[1]).toHaveAttribute('aria-selected', 'true');
		});

		await step('Enter selects the focused item', async () => {
			items[2].focus();
			await userEvent.keyboard('{Enter}');
			await expect(host).toHaveAttribute('value', 'app');
			await expect(items[2]).toHaveAttribute('aria-selected', 'true');
		});

		await step('ArrowLeft collapses an expanded parent', async () => {
			items[0].focus();
			await userEvent.keyboard('{ArrowLeft}');
			await expect(items[0]).toHaveAttribute('aria-expanded', 'false');
		});

		await step('ArrowRight expands a collapsed parent', async () => {
			await userEvent.keyboard('{ArrowRight}');
			await expect(items[0]).toHaveAttribute('aria-expanded', 'true');
		});

		await step('Home moves focus to the first visible item', async () => {
			items[2].focus();
			await userEvent.keyboard('{Home}');
			await expect(document.activeElement).toBe(items[0]);
		});
	},
};
