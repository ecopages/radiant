import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiForm } from '../form';
import { RuiLabel } from '../label';
import { RuiButton } from '../button';
import {
	RuiNumberField,
	RuiNumberFieldDecrementButton,
	RuiNumberFieldGroup,
	RuiNumberFieldIncrementButton,
	RuiNumberFieldInput,
	RuiNumberFieldSteppers,
} from './number-field';

const meta = {
	title: 'Components/NumberField',
	component: RuiNumberField,
	args: { value: 3, minValue: 0, maxValue: 10, step: 1, label: 'Quantity' },
} satisfies Meta<typeof RuiNumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

const getDecreaseButton = (canvas: HTMLElement) =>
	canvas.querySelector('[data-number-field-action="decrement"]') as HTMLButtonElement;
const getIncreaseButton = (canvas: HTMLElement) =>
	canvas.querySelector('[data-number-field-action="increment"]') as HTMLButtonElement;
const getInput = (canvas: HTMLElement) => canvas.querySelector('[data-number-field-input]') as HTMLInputElement;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-number-field') as HTMLElement;
		const input = getInput(canvasElement);

		await step('increment button raises the value', async () => {
			await userEvent.click(getIncreaseButton(canvasElement));
			await expect(input).toHaveValue('4');
			await expect(host).toHaveAttribute('value', '4');
		});

		await step('decrease is disabled at the minimum', async () => {
			for (let index = 0; index < 5; index += 1) {
				const decrease = getDecreaseButton(canvasElement);
				if (!decrease.disabled) {
					await userEvent.click(decrease);
				}
			}
			await expect(input).toHaveValue('0');
			await expect(getDecreaseButton(canvasElement)).toBeDisabled();
		});

		await step('increase is disabled at the maximum', async () => {
			for (let index = 0; index < 15; index += 1) {
				const increase = getIncreaseButton(canvasElement);
				if (!increase.disabled) {
					await userEvent.click(increase);
				}
			}
			await expect(input).toHaveValue('10');
			await expect(getIncreaseButton(canvasElement)).toBeDisabled();
		});
	},
};

export const Composed: Story = {
	render: (args) => (
		<RuiNumberField {...args}>
			<RuiNumberFieldGroup>
				<RuiNumberFieldInput />
				<RuiNumberFieldSteppers>
					<RuiNumberFieldDecrementButton />
					<RuiNumberFieldIncrementButton />
				</RuiNumberFieldSteppers>
			</RuiNumberFieldGroup>
		</RuiNumberField>
	),
};

export const CustomSteppers: Story = {
	args: {
		value: 5,
		minValue: 0,
		maxValue: 8,
		step: 1,
		label: 'Guests',
	},
	render: (args) => (
		<RuiNumberField {...args}>
			<RuiNumberFieldGroup>
				<RuiNumberFieldInput />
				<RuiNumberFieldSteppers>
					<RuiNumberFieldDecrementButton aria-label="Remove guest">Remove</RuiNumberFieldDecrementButton>
					<RuiNumberFieldIncrementButton aria-label="Add guest">Add</RuiNumberFieldIncrementButton>
				</RuiNumberFieldSteppers>
			</RuiNumberFieldGroup>
		</RuiNumberField>
	),
	play: async ({ canvasElement, step }) => {
		const input = getInput(canvasElement);

		await step('custom steppers change the value', async () => {
			await expect(getDecreaseButton(canvasElement)).toHaveTextContent('Remove');
			await expect(getIncreaseButton(canvasElement)).toHaveTextContent('Add');
			await userEvent.click(getIncreaseButton(canvasElement));
			await expect(input).toHaveValue('6');
		});

		await step('custom steppers disable at the range limits', async () => {
			await userEvent.click(getIncreaseButton(canvasElement));
			await userEvent.click(getIncreaseButton(canvasElement));
			await expect(input).toHaveValue('8');
			await expect(getIncreaseButton(canvasElement)).toBeDisabled();

			while (!getDecreaseButton(canvasElement).disabled) {
				await userEvent.click(getDecreaseButton(canvasElement));
			}
			await expect(input).toHaveValue('0');
			await expect(getDecreaseButton(canvasElement)).toBeDisabled();
		});
	},
};

export const CurrencyFormat: Story = {
	args: {
		value: 25,
		minValue: 0,
		maxValue: 1000,
		step: 0.01,
		formatOptions: JSON.stringify({ style: 'currency', currency: 'USD' }),
		label: 'Price',
	},
	play: async ({ canvasElement, step }) => {
		const input = getInput(canvasElement);

		await step('displays formatted currency', async () => {
			await expect(input).toHaveValue('$25.00');
		});

		await step('increment updates formatted display', async () => {
			await userEvent.click(getIncreaseButton(canvasElement));
			await expect(input).toHaveValue('$25.01');
		});
	},
};

export const AsField: Story = {
	render: () => (
		<RuiForm defaultValues={{ quantity: 1 }} mode="onSubmit">
			<RuiField name="quantity" rules={{ min: { value: 1, message: 'Minimum is 1' } }}>
				<RuiLabel>Quantity</RuiLabel>
				<RuiNumberField minValue={1} maxValue={10} value={1} />
				<RuiFieldDescription>Choose how many items to add.</RuiFieldDescription>
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Add to cart</RuiButton>
		</RuiForm>
	),
};
