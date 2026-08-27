import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiButton } from '../button/button';
import { RuiSeparator } from '../separator/separator';
import { RuiToolbar } from './toolbar';
import { RuiToolbar as RuiToolbarElement } from './toolbar.script';

const formattingButtons = (
	<>
		<RuiButton size="sm" variant="ghost" square toggle aria-label="Bold">
			<strong aria-hidden="true">B</strong>
		</RuiButton>
		<RuiButton size="sm" variant="ghost" square toggle aria-label="Italic">
			<em aria-hidden="true">I</em>
		</RuiButton>
		<RuiSeparator orientation="vertical" />
		<RuiButton size="sm" variant="ghost" square toggle aria-label="Underline">
			<u aria-hidden="true">U</u>
		</RuiButton>
		<RuiButton size="sm" variant="ghost" square toggle aria-label="Strikethrough">
			<s aria-hidden="true">S</s>
		</RuiButton>
	</>
);

const meta = {
	title: 'Components/Toolbar',
	component: RuiToolbar,
	parameters: {
		radiant: { element: RuiToolbarElement, cssImports: ['./toolbar.css', '../separator/separator.css'] },
	},
	args: {
		label: 'Text formatting',
		children: formattingButtons,
	},
} satisfies Meta<typeof RuiToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const buttons = Array.from(canvasElement.querySelectorAll('button')) as HTMLButtonElement[];

		await step('starts with no toggle pressed', async () => {
			for (const button of buttons) {
				await expect(button).toHaveAttribute('aria-pressed', 'false');
			}
		});

		await step('ArrowRight moves focus within the toolbar', async () => {
			buttons[0].focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(document.activeElement).toBe(buttons[1]);
		});

		await step('toggle buttons can stay pressed independently', async () => {
			await userEvent.click(buttons[0]);
			await userEvent.click(buttons[1]);
			await expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
			await expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
		});
	},
};

export const PreToggled: Story = {
	args: {
		children: (
			<>
				<RuiButton size="sm" variant="ghost" toggle defaultPressed>
					Bold
				</RuiButton>
				<RuiButton size="sm" variant="ghost" toggle>
					Italic
				</RuiButton>
				<RuiButton size="sm" variant="ghost" toggle>
					Underline
				</RuiButton>
			</>
		),
	},
	play: async ({ canvasElement, step }) => {
		const buttons = Array.from(canvasElement.querySelectorAll('button')) as HTMLButtonElement[];

		await step('Bold starts pressed while the others stay off', async () => {
			await expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
			await expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
			await expect(buttons[2]).toHaveAttribute('aria-pressed', 'false');
		});
	},
};

export const ExclusiveToggles: Story = {
	args: {
		label: 'Text alignment',
		exclusiveToggles: true,
		children: (
			<>
				<RuiButton size="sm" variant="ghost" toggle defaultPressed>
					Left
				</RuiButton>
				<RuiButton size="sm" variant="ghost" toggle>
					Center
				</RuiButton>
				<RuiButton size="sm" variant="ghost" toggle>
					Right
				</RuiButton>
			</>
		),
	},
	play: async ({ canvasElement, step }) => {
		const buttons = Array.from(canvasElement.querySelectorAll('button')) as HTMLButtonElement[];

		await step('only one toggle button stays pressed at a time', async () => {
			await expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');

			await userEvent.click(buttons[1]);
			await expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
			await expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');

			await userEvent.click(buttons[1]);
			await expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
		});
	},
};

export const FormattingCategories: Story = {
	args: { children: formattingButtons },
	play: async ({ canvasElement, step }) => {
		const separator = canvasElement.querySelector('[role="separator"]') as HTMLElement;
		const buttons = Array.from(canvasElement.querySelectorAll('button')) as HTMLButtonElement[];

		await step('uses a vertical separator between formatting categories', async () => {
			await expect(separator).toHaveAttribute('aria-orientation', 'vertical');
			await expect(separator).not.toHaveAttribute('tabindex');
		});

		await step('arrow navigation skips the separator', async () => {
			buttons[1].focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(document.activeElement).toBe(buttons[2]);
		});
	},
};
