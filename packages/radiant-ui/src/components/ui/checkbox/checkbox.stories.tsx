import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiCheckbox } from './checkbox';

const meta = {
	title: 'Components/Checkbox',
	component: RuiCheckbox,
	args: {
		checked: false,
		indeterminate: false,
		disabled: false,
		children: 'Accept terms',
	},
} satisfies Meta<typeof RuiCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

const getInput = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('rui-checkbox input[type="checkbox"]') as HTMLInputElement;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-checkbox') as HTMLElement;
		const input = getInput(canvasElement);

		await step('initial state is unchecked', async () => {
			await expect(input).not.toBeChecked();
		});

		await step('click checks the box and reflects on the host', async () => {
			await userEvent.click(input);
			await expect(input).toBeChecked();
			await expect(host).toHaveAttribute('checked');
		});

		await step('a rui-change event carries the new state', async () => {
			const emissions: boolean[] = [];
			host.addEventListener('rui-change', (event) =>
				emissions.push((event as CustomEvent<{ checked: boolean }>).detail.checked),
			);
			await userEvent.click(input);
			await expect(emissions).toEqual([false]);
		});
	},
};

export const Checked: Story = {
	args: { checked: true, children: 'Subscribed' },
};

export const Indeterminate: Story = {
	args: { indeterminate: true, children: 'Select all' },
	play: async ({ canvasElement, step }) => {
		const input = getInput(canvasElement);

		await step('mixed state exposes aria-checked=mixed and indeterminate IDL', async () => {
			await expect(input).toHaveAttribute('aria-checked', 'mixed');
			await expect(input.indeterminate).toBe(true);
		});

		await step('activating retains mixed state and updates the checked value', async () => {
			await userEvent.click(input);
			await expect(input.indeterminate).toBe(true);
			await expect(input).toBeChecked();
		});
	},
};

export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ canvasElement, step }) => {
		const input = getInput(canvasElement);

		await step('a disabled checkbox cannot be activated', async () => {
			await expect(input).toBeDisabled();
			await userEvent.click(input);
			await expect(input).not.toBeChecked();
		});
	},
};

export const AsField: Story = {
	render: () => (
		<RuiField name="terms" rules={{ required: 'You must accept the terms' }}>
			<RuiCheckbox>Accept terms and conditions</RuiCheckbox>
			<RuiFieldDescription>Required to create an account.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
};
