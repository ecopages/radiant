import { radiantMeta, type StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiButton } from '../button/button';
import { RuiToolbar } from './toolbar';
import { RuiToolbar as RuiToolbarElement } from './toolbar.script';

const formattingButtons = (
	<>
		<RuiButton size="sm" variant="ghost" toggle>
			Bold
		</RuiButton>
		<RuiButton size="sm" variant="ghost" toggle>
			Italic
		</RuiButton>
		<RuiButton size="sm" variant="ghost" toggle>
			Underline
		</RuiButton>
	</>
);

const meta = {
	title: 'Components/Toolbar',
	component: RuiToolbar,
	args: {
		label: 'Text formatting',
		children: formattingButtons,
	},
};
radiantMeta(meta, { element: RuiToolbarElement, stylesheets: ['./toolbar.css'] });

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
