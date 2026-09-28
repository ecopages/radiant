import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiMenubar } from './menubar';
import { RuiMenubar as RuiMenubarElement } from './menubar.script';

const meta = {
	title: 'Components/Menubar',
	component: RuiMenubar,
	parameters: {
		radiant: {
			element: RuiMenubarElement,
			cssImports: ['../../../styles/primitives.css', '../separator/separator.css', './menubar.css'],
		},
	},
	args: {
		label: 'Application',
		items: [
			{
				id: 'file',
				label: 'File',
				items: [
					{ value: 'new', label: 'New' },
					{
						value: 'open',
						label: 'Open',
						items: [{ value: 'recent', label: 'Recent' }],
					},
				],
			},
			{
				id: 'edit',
				label: 'Edit',
				items: [
					{ value: 'cut', label: 'Cut' },
					{ value: 'copy', label: 'Copy' },
				],
			},
			{ id: 'view', label: 'View' },
		],
	},
} satisfies Meta<typeof RuiMenubar>;

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

export const NestedSubmenus: Story = {
	args: {
		items: [
			{
				id: 'file',
				label: 'File',
				items: [
					{ value: 'new', label: 'New' },
					{ type: 'separator', id: 'sharing-actions' },
					{ value: 'share', label: 'Share', items: [{ value: 'email', label: 'Email' }] },
				],
			},
			{ id: 'edit', label: 'Edit', items: [{ value: 'copy', label: 'Copy' }] },
		],
	},
	play: async ({ canvasElement, step }) => {
		const file = canvasElement.querySelector('[data-ref="menubar-root"] > [role="menuitem"]') as HTMLElement;
		file.focus();
		await userEvent.keyboard('{ArrowDown}');
		await expect(canvasElement.querySelector('[role="separator"]')).toHaveAttribute(
			'aria-orientation',
			'horizontal',
		);
		const share = canvasElement.querySelector('[data-value="share"]') as HTMLElement;
		await userEvent.keyboard('{ArrowDown}');
		await expect(document.activeElement).toBe(share);

		await step('ArrowRight opens a nested menubar submenu', async () => {
			await userEvent.keyboard('{ArrowRight}');
			await expect(share.nextElementSibling).not.toHaveAttribute('hidden');
			await expect(document.activeElement).toHaveAttribute('data-value', 'email');
		});

		await step('ArrowRight on a nested leaf opens the next top-level menu', async () => {
			await userEvent.keyboard('{ArrowRight}');
			const edit = canvasElement.querySelectorAll(
				'[data-ref="menubar-root"] > [role="menuitem"]',
			)[1] as HTMLElement;
			await expect(edit).toHaveAttribute('aria-expanded', 'true');
			await expect(document.activeElement).toHaveAttribute('data-value', 'copy');
		});

		await step('hover switches an already-open top-level menu', async () => {
			await userEvent.hover(file);
			await expect(file).toHaveAttribute('aria-expanded', 'true');
		});
	},
};

export const PointerOpening: Story = {
	play: async ({ canvasElement, step }) => {
		const file = canvasElement.querySelector('[data-ref="menubar-root"] > [role="menuitem"]') as HTMLElement;

		await step('pointer opening keeps focus on the top-level trigger', async () => {
			await userEvent.click(file);
			await expect(file).toHaveAttribute('aria-expanded', 'true');
			await expect(document.activeElement).toBe(file);
		});
	},
};
