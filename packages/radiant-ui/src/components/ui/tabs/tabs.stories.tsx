import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiTabs } from './tabs';

const defaultItems = [
	{ id: 'overview', label: 'Overview', children: <p>Overview content</p> },
	{ id: 'features', label: 'Features', children: <p>Features content</p> },
	{ id: 'pricing', label: 'Pricing', children: <p>Pricing content</p> },
];

const meta = {
	title: 'Components/Tabs',
	component: RuiTabs,
	args: {
		label: 'Product sections',
		automatic: true,
		items: defaultItems,
	},
} satisfies Meta<typeof RuiTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const getTabs = (canvasElement: HTMLElement) =>
	Array.from(canvasElement.querySelectorAll('[role="tab"]')) as HTMLElement[];
const getPanels = (canvasElement: HTMLElement) =>
	Array.from(canvasElement.querySelectorAll('[role="tabpanel"]')) as HTMLElement[];

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const tabs = getTabs(canvasElement);
		const panels = getPanels(canvasElement);

		await step('first tab is selected by default', async () => {
			await expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
			await expect(panels[0]).not.toHaveAttribute('hidden');
			await expect(panels[1]).toHaveAttribute('hidden');
		});

		await step('clicking a tab activates its panel', async () => {
			await userEvent.click(tabs[1]);
			await expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
			await expect(panels[1]).not.toHaveAttribute('hidden');
			await expect(panels[0]).toHaveAttribute('hidden');
		});
	},
};

export const Keyboard: Story = {
	play: async ({ canvasElement, step }) => {
		const tabs = getTabs(canvasElement);
		const panels = getPanels(canvasElement);

		await step('ArrowRight moves focus and activates the next tab', async () => {
			tabs[0].focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(document.activeElement).toBe(tabs[1]);
			await expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
			await expect(panels[1]).not.toHaveAttribute('hidden');
		});

		await step('Home and End jump to first and last tabs', async () => {
			await userEvent.keyboard('{End}');
			await expect(document.activeElement).toBe(tabs[2]);
			await expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
			await userEvent.keyboard('{Home}');
			await expect(document.activeElement).toBe(tabs[0]);
			await expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
		});
	},
};

export const Manual: Story = {
	args: { automatic: false },
	play: async ({ canvasElement, step }) => {
		const tabs = getTabs(canvasElement);
		const panels = getPanels(canvasElement);

		await step('ArrowRight moves focus without activating in manual mode', async () => {
			tabs[0].focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(document.activeElement).toBe(tabs[1]);
			await expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
			await expect(panels[0]).not.toHaveAttribute('hidden');
		});

		await step('Enter activates the focused tab', async () => {
			await userEvent.keyboard('{Enter}');
			await expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
			await expect(panels[1]).not.toHaveAttribute('hidden');
		});
	},
};
