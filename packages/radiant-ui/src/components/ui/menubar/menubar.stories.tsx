import { radiantMeta, type StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiMenubar } from './menubar';
import { RuiMenubar as RuiMenubarElement } from './menubar.script';

const meta = {
	title: 'Components/Menubar',
	component: RuiMenubar,
	args: {
		label: 'Application',
		items: [
			{
				id: 'file',
				label: 'File',
				items: [
					{ id: 'new', label: 'New' },
					{ id: 'open', label: 'Open' },
				],
			},
			{
				id: 'edit',
				label: 'Edit',
				items: [
					{ id: 'cut', label: 'Cut' },
					{ id: 'copy', label: 'Copy' },
				],
			},
			{ id: 'view', label: 'View' },
		],
	},
};
radiantMeta(meta, { element: RuiMenubarElement, stylesheets: ['./menubar.css'] });

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const tops = Array.from(
			canvasElement.querySelectorAll('[data-ref="menubar-root"] > [role="menuitem"]'),
		) as HTMLElement[];

		await step('ArrowRight moves across top-level items', async () => {
			tops[0].focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(document.activeElement).toBe(tops[1]);
		});

		await step('ArrowDown opens the File menu and focuses the first item', async () => {
			tops[0].focus();
			await userEvent.keyboard('{ArrowDown}');
			const menu = canvasElement.querySelector('[role="menu"]:not([hidden])');
			await expect(menu).toBeTruthy();
			await expect(document.activeElement).toHaveAttribute('data-value', 'new');
		});

		await step('open menu top item shows aria-expanded styling', async () => {
			await expect(tops[0]).toHaveAttribute('aria-expanded', 'true');
		});

		await step('clicking a top item without a menu closes the open menu', async () => {
			await userEvent.click(tops[2]);
			await expect(tops[0]).toHaveAttribute('aria-expanded', 'false');
			await expect(canvasElement.querySelector('[role="menu"]:not([hidden])')).toBeNull();
		});
	},
};
