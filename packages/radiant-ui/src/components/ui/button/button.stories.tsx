import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiButton } from './button';

/**
 * Presentational native `<button>` wrapper. No custom element — `variant` and
 * `size` only map to CSS classes. Sizes are `none` (inline `link`), Small (`sm`),
 * Default (`md`), and Large (`lg`); control sizes set their own type scale.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/button/
 */
const meta = {
	title: 'Components/Button',
	component: RuiButton,
	parameters: { radiant: { cssImports: ['./button.css'] } },
	args: {
		variant: 'filled',
		size: 'md',
		disabled: false,
		children: 'Button',
	},
} satisfies Meta<typeof RuiButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
	render: () => (
		<div class="flex flex-col gap-4">
			<div class="flex flex-wrap items-center gap-3">
				<RuiButton variant="filled">Filled</RuiButton>
				<RuiButton variant="outline">Outline</RuiButton>
				<RuiButton variant="ghost">Ghost</RuiButton>
				<RuiButton variant="link" size="none">
					Link
				</RuiButton>
				<RuiButton variant="destructive">Destructive</RuiButton>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<RuiButton variant="link" size="none" href="/docs">
					Link with href
				</RuiButton>
				<span class="text-on-surface">
					Inline copy with a{' '}
					<RuiButton variant="link" size="none" href="/docs">
						navigation link
					</RuiButton>
					.
				</span>
			</div>
			<div class="flex items-center gap-3">
				<RuiButton size="sm">Small</RuiButton>
				<RuiButton size="md">Default</RuiButton>
				<RuiButton size="lg">Large</RuiButton>
				<RuiButton disabled>Disabled</RuiButton>
			</div>
		</div>
	),
};

export const Toggle: Story = {
	args: { toggle: true, children: 'Toggle bold' },
	play: async ({ canvasElement, step }) => {
		const button = canvasElement.querySelector('button') as HTMLButtonElement;

		await step('initial state is not pressed', async () => {
			await expect(button).toHaveAttribute('aria-pressed', 'false');
		});

		await step('click toggles aria-pressed', async () => {
			await userEvent.click(button);
			await expect(button).toHaveAttribute('aria-pressed', 'true');
			await userEvent.click(button);
			await expect(button).toHaveAttribute('aria-pressed', 'false');
		});
	},
};

export const Link: Story = {
	render: () => (
		<div class="flex flex-col items-start gap-3">
			<RuiButton href="/docs" variant="filled">
				Filled link
			</RuiButton>
			<RuiButton href="/docs" variant="link" size="none">
				Link-styled navigation
			</RuiButton>
		</div>
	),
};
