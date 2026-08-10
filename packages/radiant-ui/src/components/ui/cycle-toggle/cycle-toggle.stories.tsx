import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { isStaticSsrPreview } from '@/lib/storybook-ssr';
import type { RuiCycleToggleChangeDetail, RuiCycleToggleProps } from './cycle-toggle.script';
import { RuiCycleToggle as RuiCycleToggleElement } from './cycle-toggle.script';
import { RuiCycleToggle, RuiCycleToggleItem } from './cycle-toggle';
import { ThemePreferenceItemContent } from './theme-preference-icons';

function renderThemeItems(mode: 'icon-label' | 'icon-only', value: string) {
	return (
		<>
			<RuiCycleToggleItem id="system" selected={value === 'system'}>
				<ThemePreferenceItemContent preference="system" showLabel={mode === 'icon-label'} />
			</RuiCycleToggleItem>
			<RuiCycleToggleItem id="light" selected={value === 'light'}>
				<ThemePreferenceItemContent preference="light" showLabel={mode === 'icon-label'} />
			</RuiCycleToggleItem>
			<RuiCycleToggleItem id="dark" selected={value === 'dark'}>
				<ThemePreferenceItemContent preference="dark" showLabel={mode === 'icon-label'} />
			</RuiCycleToggleItem>
		</>
	);
}

function renderThemePreference(args: RuiCycleToggleProps) {
	const value = args.value || 'system';

	return (
		<RuiCycleToggle {...args} value={value} label="Theme" variant="ghost" size="sm">
			{renderThemeItems('icon-label', value)}
		</RuiCycleToggle>
	);
}

const meta = {
	title: 'Components/Cycle Toggle',
	component: RuiCycleToggle,
	parameters: {
		radiant: { element: RuiCycleToggleElement, cssImports: ['./cycle-toggle.css', '../button/button.css'] },
	},
	args: {
		value: 'system',
		variant: 'ghost',
		size: 'sm',
		disabled: false,
		label: 'Theme',
	},
	render: (args: RuiCycleToggleProps) => renderThemePreference(args),
} satisfies Meta<typeof RuiCycleToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

const getHost = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('rui-cycle-toggle') as RuiCycleToggleElement;
const getButton = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('[data-cycle-toggle-button]') as HTMLButtonElement;
const getVisibleItem = (button: HTMLButtonElement) =>
	button.querySelector('[data-cycle-value]:not([hidden])') as HTMLElement | null;

export const ThemePreference: Story = {
	args: { value: 'system' },
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;

		const host = getHost(canvasElement);
		const button = getButton(canvasElement);

		await step('initial state shows system', async () => {
			await expect(host).toHaveAttribute('value', 'system');
			await expect(button.textContent).toContain('System');
			await expect(button).toHaveAccessibleName('Theme: System');
		});

		await step('clicking advances the value and emits rui-change', async () => {
			const emissions: string[] = [];
			host.addEventListener('rui-change', (event) =>
				emissions.push((event as CustomEvent<RuiCycleToggleChangeDetail>).detail.value),
			);

			await userEvent.click(button);
			await expect(host).toHaveAttribute('value', 'light');
			await expect(button.textContent).toContain('Light');
			await expect(button).toHaveAccessibleName('Theme: Light');
			await expect(emissions).toEqual(['light']);

			await userEvent.click(button);
			await expect(host).toHaveAttribute('value', 'dark');
			await expect(emissions).toEqual(['light', 'dark']);
		});

		await step('host presentation props stay synchronized with the native button', async () => {
			host.disabled = true;
			host.variant = 'outline';
			host.size = 'lg';

			await expect(button).toBeDisabled();
			await expect(button).toHaveClass('rui-button--outline');
			await expect(button).toHaveClass('rui-button--lg');
		});
	},
};

export const ThemeIconOnly: Story = {
	args: { value: 'system' },
	render: (args: RuiCycleToggleProps) => {
		const value = args.value || 'system';

		return (
			<RuiCycleToggle {...args} value={value} label="Theme" variant="ghost" size="sm">
				{renderThemeItems('icon-only', value)}
			</RuiCycleToggle>
		);
	},
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;

		const host = getHost(canvasElement);
		const button = getButton(canvasElement);

		await step('icon-only items keep sr-only labels', async () => {
			await expect(getVisibleItem(button)?.querySelector('.sr-only')?.textContent).toBe('System');
		});

		await step('clicking emits rui-change with the next theme value', async () => {
			const emissions: string[] = [];
			host.addEventListener('rui-change', (event) =>
				emissions.push((event as CustomEvent<RuiCycleToggleChangeDetail>).detail.value),
			);

			await userEvent.click(button);
			await expect(emissions).toEqual(['light']);
			await expect(host).toHaveAttribute('value', 'light');
			await expect(getVisibleItem(button)?.querySelector('.sr-only')?.textContent).toBe('Light');
		});
	},
};

export const SortOrder: Story = {
	args: {
		value: 'newest',
		variant: 'outline',
		size: 'md',
		label: 'Sort order',
	},
	render: (args: RuiCycleToggleProps) => (
		<RuiCycleToggle {...args}>
			<RuiCycleToggleItem id="newest" selected={args.value === 'newest'}>
				Newest
			</RuiCycleToggleItem>
			<RuiCycleToggleItem id="oldest" selected={args.value === 'oldest'}>
				Oldest
			</RuiCycleToggleItem>
			<RuiCycleToggleItem id="popular" selected={args.value === 'popular'}>
				Popular
			</RuiCycleToggleItem>
		</RuiCycleToggle>
	),
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;

		const host = getHost(canvasElement);
		const button = getButton(canvasElement);

		await step('clicking advances sort order and emits rui-change', async () => {
			const emissions: string[] = [];
			host.addEventListener('rui-change', (event) =>
				emissions.push((event as CustomEvent<RuiCycleToggleChangeDetail>).detail.value),
			);

			await userEvent.click(button);
			await expect(host).toHaveAttribute('value', 'oldest');
			await expect(button.textContent).toContain('Oldest');
			await expect(emissions).toEqual(['oldest']);
		});
	},
};
