import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiMenuButton, RuiMenuButtonContent, RuiMenuButtonItem, RuiMenuButtonTrigger } from './menu-button';
import { RuiMenuButton as RuiMenuButtonElement } from './menu-button.script';

const meta = {
	title: 'Components/Menu Button',
	component: RuiMenuButton,
	parameters: {
		radiant: {
			element: RuiMenuButtonElement,
			cssImports: ['../../../styles/primitives.css', '../button/button.css', './menu-button.css'],
		},
	},
	args: {
		open: false,
		trigger: 'Actions',
		items: [
			{ value: 'edit', label: 'Edit' },
			{ value: 'duplicate', label: 'Duplicate' },
			{ value: 'delete', label: 'Delete' },
		],
	},
} satisfies Meta<typeof RuiMenuButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const getTrigger = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('rui-menu-button [data-ref="trigger"]') as HTMLButtonElement;
const getMenu = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('rui-menu-button [role="menu"]') as HTMLElement;
const getItems = (canvasElement: HTMLElement) =>
	Array.from(canvasElement.querySelectorAll('[role="menuitem"]')) as HTMLElement[];

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-menu-button') as HTMLElement;
		const trigger = getTrigger(canvasElement);
		const menu = getMenu(canvasElement);
		const items = getItems(canvasElement);

		await step('starts closed with aria-haspopup=menu', async () => {
			await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
			await expect(menu).toHaveAttribute('hidden');
		});

		await step('click opens the menu and focuses the first item', async () => {
			await userEvent.click(trigger);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await expect(menu).not.toHaveAttribute('hidden');
			await expect(document.activeElement).toHaveAttribute('role', 'menuitem');
			await expect(document.activeElement).toHaveAttribute('data-value', 'edit');
		});

		await step('selecting an item emits rui-change and closes', async () => {
			const emissions: string[] = [];
			host.addEventListener('rui-change', (event) =>
				emissions.push((event as CustomEvent<{ value: string }>).detail.value),
			);
			await userEvent.click(items[1]);
			await expect(emissions).toEqual(['duplicate']);
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});
	},
};

export const Keyboard: Story = {
	play: async ({ canvasElement, step }) => {
		const trigger = getTrigger(canvasElement);

		await step('ArrowDown opens and focuses the first item', async () => {
			trigger.focus();
			await userEvent.keyboard('{ArrowDown}');
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await expect(document.activeElement).toHaveAttribute('data-value', 'edit');
		});

		await step('ArrowDown moves to the next item', async () => {
			await userEvent.keyboard('{ArrowDown}');
			await expect(document.activeElement).toHaveAttribute('data-value', 'duplicate');
		});

		await step('Escape closes and returns focus to the trigger', async () => {
			await userEvent.keyboard('{Escape}');
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
			await expect(document.activeElement).toBe(trigger);
		});
	},
};

export const Composed: Story = {
	render: () => (
		<RuiMenuButton>
			<RuiMenuButtonTrigger>Actions</RuiMenuButtonTrigger>
			<RuiMenuButtonContent>
				<RuiMenuButtonItem value="edit">Edit</RuiMenuButtonItem>
				<RuiMenuButtonItem value="duplicate">Duplicate</RuiMenuButtonItem>
				<RuiMenuButtonItem value="delete">Delete</RuiMenuButtonItem>
			</RuiMenuButtonContent>
		</RuiMenuButton>
	),
	play: async ({ canvasElement, step }) => {
		const trigger = getTrigger(canvasElement);
		const menu = getMenu(canvasElement);

		await step('composed trigger opens the composed menu', async () => {
			await userEvent.click(trigger);
			await expect(menu).not.toHaveAttribute('hidden');
		});
	},
};
