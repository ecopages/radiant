import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { isStaticSsrPreview } from '@/lib/storybook-ssr';
import { RuiTagGroup } from './tag-group';
import { RuiTagGroup as RuiTagGroupElement } from './tag-group.script';

const meta = {
	title: 'Components/TagGroup',
	component: RuiTagGroup,
	parameters: { radiant: { element: RuiTagGroupElement, cssImports: ['./tag-group.css'] } },
	args: {
		label: 'Categories',
		tags: [
			{ value: 'news', label: 'News' },
			{ value: 'travel', label: 'Travel' },
			{ value: 'gaming', label: 'Gaming' },
			{ value: 'shopping', label: 'Shopping' },
		],
	},
} satisfies Meta<typeof RuiTagGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;

		const tags = Array.from(canvasElement.querySelectorAll('[data-tag]')) as HTMLElement[];

		await step('clicking a tag selects it', async () => {
			await userEvent.click(tags[0]);
			await expect(tags[0]).toHaveAttribute('aria-selected', 'true');
			await expect(canvasElement.querySelector('rui-tag-group')).toHaveAttribute('value', 'news');
		});

		await step('remove button emits removal', async () => {
			const remove = tags[0].querySelector('[data-tag-remove]') as HTMLButtonElement;
			await userEvent.click(remove);
			await expect(
				(canvasElement.querySelector('rui-tag-group') as HTMLElement & { value?: string }).value ?? '',
			).toBe('');
		});
	},
};

export const MultipleSelection: Story = {
	args: {
		selectionMode: 'multiple',
		value: 'news,travel',
	},
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;

		const tags = Array.from(canvasElement.querySelectorAll('[data-tag]')) as HTMLElement[];

		await step('multiple tags can be selected', async () => {
			await expect(tags[0]).toHaveAttribute('aria-selected', 'true');
			await expect(tags[1]).toHaveAttribute('aria-selected', 'true');
			await userEvent.click(tags[2]);
			await expect(canvasElement.querySelector('rui-tag-group')).toHaveAttribute('value', 'news,travel,gaming');
		});
	},
};
