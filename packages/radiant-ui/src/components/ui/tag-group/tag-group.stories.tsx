import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
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
				(canvasElement.querySelector('rui-tag-group') as HTMLElement & { value?: string[] }).value ?? [],
			).toEqual([]);
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

export const Reorderable: Story = {
	args: { reorderable: true, value: '' },
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;

		const host = canvasElement.querySelector('rui-tag-group') as HTMLElement;
		const order = () =>
			Array.from(canvasElement.querySelectorAll('[data-tag]')).map((tag) => tag.getAttribute('data-value'));
		const tag = (value: string) => canvasElement.querySelector(`[data-value="${value}"]`) as HTMLElement;
		const reordered: unknown[] = [];
		host.addEventListener('rui-reorder', (event) => reordered.push((event as CustomEvent).detail));

		await step('Space lifts, arrows move and Space drops', async () => {
			tag('news').focus();
			await userEvent.keyboard(' ');
			await userEvent.keyboard('{ArrowRight}{ArrowRight}');
			await userEvent.keyboard(' ');
			await expect(order()).toEqual(['travel', 'gaming', 'news', 'shopping']);
			await expect(reordered).toEqual([{ value: 'news', from: 0, to: 2 }]);
			await expect(tag('news')).toHaveFocus();
			await expect(host).not.toHaveAttribute('value');
		});

		await step('a pointer drag reorders', async () => {
			const from = tag('shopping').getBoundingClientRect();
			const to = tag('travel').getBoundingClientRect();
			await userEvent.pointer([
				{
					keys: '[MouseLeft>]',
					target: tag('shopping'),
					coords: { clientX: from.left + 4, clientY: from.top + 4 },
				},
				{ coords: { clientX: to.left + 2, clientY: to.top + 4 } },
				{ keys: '[/MouseLeft]' },
			]);
			await waitFor(() => expect(order()).toEqual(['shopping', 'travel', 'gaming', 'news']));
		});
	},
};
