import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiLabel } from '../label';
import { RuiSpinbutton } from './spinbutton';

const meta = {
	title: 'Components/Spinbutton',
	component: RuiSpinbutton,
	args: { value: 3, min: 0, max: 10, step: 1, label: 'Quantity' },
} satisfies Meta<typeof RuiSpinbutton>;

export default meta;
type Story = StoryObj<typeof meta>;

const getDecreaseButton = (canvas: HTMLElement) =>
	canvas.querySelector('[data-spinbutton-action="decrease"]') as HTMLButtonElement;
const getIncreaseButton = (canvas: HTMLElement) =>
	canvas.querySelector('[data-spinbutton-action="increase"]') as HTMLButtonElement;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-spinbutton') as HTMLElement;
		const input = canvasElement.querySelector('[role="spinbutton"]') as HTMLInputElement;

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

export const CustomSteppers: Story = {
	args: {
		value: 5,
		min: 0,
		max: 8,
		step: 1,
		label: 'Guests',
		children: (
			<>
				<button
					slot="decrease"
					type="button"
					data-spinbutton-action="decrease"
					class="rui-button rui-button--ghost rui-button--sm"
					aria-label="Remove guest"
				>
					Remove
				</button>
				<button
					slot="increase"
					type="button"
					data-spinbutton-action="increase"
					class="rui-button rui-button--filled rui-button--sm"
					aria-label="Add guest"
				>
					Add
				</button>
			</>
		),
	},
	play: async ({ canvasElement, step }) => {
		const input = canvasElement.querySelector('[role="spinbutton"]') as HTMLInputElement;

		await step('custom slotted steppers change the value', async () => {
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

export const AsField: Story = {
	render: () => (
		<RuiField name="quantity" rules={{ min: { value: 1, message: 'Minimum is 1' } }}>
			<RuiLabel>Quantity</RuiLabel>
			<RuiSpinbutton min={1} max={10} value={1} />
			<RuiFieldDescription>Choose how many items to add.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
};
