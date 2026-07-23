import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiSwitch } from './switch';

const meta = {
	title: 'Components/Switch',
	component: RuiSwitch,
	args: {
		checked: false,
		disabled: false,
		children: 'Notifications',
	},
} satisfies Meta<typeof RuiSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

const getInput = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('rui-switch input[role="switch"]') as HTMLInputElement;
const getLabel = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('rui-switch .rui-switch__label') as HTMLElement;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-switch') as HTMLElement;
		const input = getInput(canvasElement);
		const label = getLabel(canvasElement);

		await step('initial state is off', async () => {
			await expect(input).not.toBeChecked();
			await expect(input).toHaveAttribute('role', 'switch');
		});

		await step('clicking the visible label toggles via native label association', async () => {
			await userEvent.click(label);
			await expect(input).toBeChecked();
			await expect(host).toHaveAttribute('checked');
		});

		await step('a rui-change event carries the new state', async () => {
			const emissions: boolean[] = [];
			host.addEventListener('rui-change', (event) =>
				emissions.push((event as CustomEvent<{ checked: boolean }>).detail.checked),
			);
			await userEvent.click(label);
			await expect(emissions).toEqual([false]);
			await expect(input).not.toBeChecked();
		});
	},
};

export const On: Story = {
	args: { checked: true, children: 'Dark mode' },
};

export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ canvasElement, step }) => {
		const input = getInput(canvasElement);
		const label = getLabel(canvasElement);

		await step('a disabled switch cannot be activated', async () => {
			await expect(input).toBeDisabled();
			await userEvent.click(label);
			await expect(input).not.toBeChecked();
		});
	},
};

export const Keyboard: Story = {
	play: async ({ canvasElement, step }) => {
		const input = getInput(canvasElement);

		await step('Space toggles the switch', async () => {
			input.focus();
			await userEvent.keyboard(' ');
			await expect(input).toBeChecked();
			await userEvent.keyboard(' ');
			await expect(input).not.toBeChecked();
		});
	},
};
