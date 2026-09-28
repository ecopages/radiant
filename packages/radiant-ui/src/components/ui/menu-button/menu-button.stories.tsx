import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import {
	RuiMenuButton,
	RuiMenuButtonContent,
	RuiMenuButtonItem,
	RuiMenuButtonSubmenuContent,
	RuiMenuButtonTrigger,
} from './menu-button';
import { RuiMenuButton as RuiMenuButtonElement } from './menu-button.script';

const meta = {
	title: 'Components/Menu Button',
	component: RuiMenuButton,
	parameters: {
		radiant: {
			element: RuiMenuButtonElement,
			cssImports: [
				'../../../styles/primitives.css',
				'../button/button.css',
				'../separator/separator.css',
				'./menu-button.css',
			],
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

export const Submenus: Story = {
	render: () => (
		<RuiMenuButton>
			<RuiMenuButtonTrigger>Actions</RuiMenuButtonTrigger>
			<RuiMenuButtonContent>
				<RuiMenuButtonItem value="edit">Edit</RuiMenuButtonItem>
				<RuiMenuButtonItem value="share" hasSubmenu>
					Share
				</RuiMenuButtonItem>
				<RuiMenuButtonSubmenuContent>
					<RuiMenuButtonItem value="email">Email</RuiMenuButtonItem>
					<RuiMenuButtonItem value="copy" hasSubmenu>
						Copy
					</RuiMenuButtonItem>
					<RuiMenuButtonSubmenuContent>
						<RuiMenuButtonItem value="copy-link">Copy link</RuiMenuButtonItem>
					</RuiMenuButtonSubmenuContent>
				</RuiMenuButtonSubmenuContent>
			</RuiMenuButtonContent>
		</RuiMenuButton>
	),
	play: async ({ canvasElement, step }) => {
		const trigger = getTrigger(canvasElement);
		const share = canvasElement.querySelector('[data-value="share"]') as HTMLElement;
		const submenu = share.nextElementSibling as HTMLElement;

		await step('keyboard opens nested menus and moves focus into them', async () => {
			await userEvent.click(trigger);
			await userEvent.keyboard('{ArrowDown}');
			await expect(document.activeElement).toHaveAttribute('data-value', 'share');
			await userEvent.keyboard('{ArrowRight}');
			await expect(submenu).not.toHaveAttribute('hidden');
			await expect(document.activeElement).toHaveAttribute('data-value', 'email');
		});

		await step('left closes only the current submenu and restores its trigger', async () => {
			await userEvent.keyboard('{ArrowLeft}');
			await expect(submenu).toHaveAttribute('hidden');
			await expect(document.activeElement).toHaveAttribute('data-value', 'share');
		});

		await step('hover opens a submenu after the delay without moving focus', async () => {
			const active = document.activeElement;
			await userEvent.hover(share);
			await new Promise((resolve) => setTimeout(resolve, 220));
			await expect(submenu).not.toHaveAttribute('hidden');
			await expect(document.activeElement).toBe(active);
		});
	},
};

export const SeparatedActions: Story = {
	args: {
		items: [
			{ value: 'edit', label: 'Edit' },
			{ type: 'separator', id: 'destructive-actions' },
			{ value: 'delete', label: 'Delete' },
		],
	},
	play: async ({ canvasElement, step }) => {
		const trigger = getTrigger(canvasElement);

		await step('renders a non-focusable separator between action groups', async () => {
			await userEvent.click(trigger);
			const separator = canvasElement.querySelector('[role="separator"]') as HTMLElement;
			await expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
			await expect(separator).not.toHaveAttribute('tabindex');
		});

		await step('arrow navigation skips the separator', async () => {
			await userEvent.keyboard('{ArrowDown}');
			await expect(document.activeElement).toHaveAttribute('data-value', 'delete');
		});
	},
};
