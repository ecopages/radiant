import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect } from 'storybook/test';
import { RuiBreadcrumb } from './breadcrumb';

const meta = {
	title: 'Components/Breadcrumb',
	component: RuiBreadcrumb,
	args: {
		label: 'Breadcrumb',
		items: [
			{ href: '/', label: 'Home' },
			{ href: '/products', label: 'Products' },
			{ label: 'Radiant UI', current: true },
		],
	},
} satisfies Meta<typeof RuiBreadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		await step('exposes a navigation landmark labeled Breadcrumb', async () => {
			const nav = canvasElement.querySelector('nav');
			await expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
		});

		await step('marks the current page with aria-current=page', async () => {
			const current = canvasElement.querySelector('[aria-current="page"]');
			await expect(current).toHaveTextContent('Radiant UI');
		});

		await step('ancestor crumbs are links', async () => {
			const links = canvasElement.querySelectorAll('a');
			await expect(links).toHaveLength(2);
			await expect(links[0]).toHaveAttribute('href', '/');
			await expect(links[1]).toHaveAttribute('href', '/products');
		});
	},
};
