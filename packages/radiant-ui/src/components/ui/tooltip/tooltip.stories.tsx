import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiTooltip } from './tooltip';

const meta = {
	title: 'Components/Tooltip',
	component: RuiTooltip,
	args: {
		content: 'Save your changes',
		delay: 0,
		children: (
			<button type="button" class="rui-button rui-button--filled rui-button--md">
				Save
			</button>
		),
	},
} satisfies Meta<typeof RuiTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

const getTooltip = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('rui-tooltip [role="tooltip"]') as HTMLElement;
const getButton = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('rui-tooltip button') as HTMLButtonElement;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const tooltip = getTooltip(canvasElement);
		const button = getButton(canvasElement);

		await step('tooltip starts hidden and describes the focusable trigger', async () => {
			await expect(tooltip).toHaveAttribute('hidden');
			await expect(button).toHaveAttribute('aria-describedby', tooltip.id);
		});

		await step('focus shows the tooltip', async () => {
			button.focus();
			await expect(tooltip).not.toHaveAttribute('hidden');
			await expect(tooltip).toHaveTextContent('Save your changes');
		});

		await step('Escape dismisses the tooltip', async () => {
			await userEvent.keyboard('{Escape}');
			await expect(tooltip).toHaveAttribute('hidden');
		});
	},
};

export const Hover: Story = {
	args: { delay: 0, content: 'Appears on hover' },
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-tooltip') as HTMLElement;
		const tooltip = getTooltip(canvasElement);

		await step('pointer enter shows the tooltip', async () => {
			host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
			await expect(tooltip).not.toHaveAttribute('hidden');
		});
	},
};
