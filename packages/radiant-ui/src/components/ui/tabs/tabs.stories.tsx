import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiTabs as RuiTabsElement, type RuiTabsProps } from './tabs.script';
import { RuiTab, RuiTabList, RuiTabPanel, RuiTabPanels, RuiTabs } from './tabs';

const tabIcon = (paths: string | readonly string[]) => {
	const d = Array.isArray(paths) ? paths : [paths];
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{d.map((path) => (
				<path d={path} />
			))}
		</svg>
	);
};

function renderProductTabs(args: RuiTabsProps) {
	return (
		<RuiTabs {...args}>
			<RuiTabList aria-label="Product sections">
				<RuiTab id="overview">
					<span class="inline-flex items-center gap-1.5">
						{tabIcon([
							'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
							'M14 2v4a2 2 0 0 0 2 2h4',
						])}
						Overview
					</span>
				</RuiTab>
				<RuiTab id="features">
					<span class="inline-flex items-center gap-1.5">
						{tabIcon(['M12 3v18', 'm8 7 4-4 4 4', 'M8 17h8'])}
						Features
					</span>
				</RuiTab>
				<RuiTab id="pricing">
					<span class="inline-flex items-center gap-1.5">
						{tabIcon(['M12 2v20', 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'])}
						Pricing
					</span>
				</RuiTab>
			</RuiTabList>
			<RuiTabPanels>
				<RuiTabPanel id="overview">
					<p class="text-sm text-on-background/80">pnpm create @ecopages/radiant my-app</p>
				</RuiTabPanel>
				<RuiTabPanel id="features">
					<p class="text-sm text-on-background/80">Light DOM components with APG keyboard behavior.</p>
				</RuiTabPanel>
				<RuiTabPanel id="pricing">
					<p class="text-sm text-on-background/80">Open source under MIT.</p>
				</RuiTabPanel>
			</RuiTabPanels>
		</RuiTabs>
	);
}

const meta = {
	title: 'Components/Tabs',
	component: RuiTabsElement,
	args: {
		variant: 'boxed',
		automatic: true,
	},
	render: (args: RuiTabsProps) => renderProductTabs(args),
} satisfies Meta<RuiTabsProps>;

export default meta;
type Story = StoryObj<RuiTabsProps>;

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

export const Ghost: Story = {
	args: { variant: 'ghost' },
};

export const Boxed: Story = {
	args: { variant: 'boxed' },
};

export const Composed: Story = {
	render: () => (
		<RuiTabs variant="boxed">
			<RuiTabList aria-label="Settings">
				<RuiTab id="general">General</RuiTab>
				<RuiTab id="appearance">Appearance</RuiTab>
				<RuiTab id="notifications">Notifications</RuiTab>
				<RuiTab id="profile">Profile</RuiTab>
			</RuiTabList>
			<RuiTabPanels>
				<RuiTabPanel id="general">
					<div class="flex flex-col gap-3 text-sm">
						<p>Homepage and sidebar preferences.</p>
					</div>
				</RuiTabPanel>
				<RuiTabPanel id="appearance">
					<div class="flex flex-col gap-3 text-sm">
						<p>Theme and font size options.</p>
					</div>
				</RuiTabPanel>
				<RuiTabPanel id="notifications">
					<p class="text-sm">Notification settings.</p>
				</RuiTabPanel>
				<RuiTabPanel id="profile">
					<div class="flex flex-col gap-3 text-sm">
						<p>Name and username.</p>
					</div>
				</RuiTabPanel>
			</RuiTabPanels>
		</RuiTabs>
	),
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
