import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiLabel } from '../label';
import { RuiInput } from './input';

const meta = {
	title: 'Components/Input',
	component: RuiInput,
	parameters: { radiant: { cssImports: ['./input.css'] } },
	args: {
		placeholder: 'Enter text',
	},
} satisfies Meta<typeof RuiInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Masked: Story = {
	args: {
		mask: '+{7}(000)000-00-00',
		'aria-label': 'Phone number',
	},
	play: async ({ canvasElement, step }) => {
		const input = canvasElement.querySelector('input') as HTMLInputElement;

		await step('shows a placeholder derived from the mask', async () => {
			await expect(input.placeholder).toBe('+7(___)___-__-__');
		});

		await step('formats digits as the user types', async () => {
			await userEvent.click(input);
			await userEvent.keyboard('9123456789');
			await expect(input).toHaveValue('+7(912)345-67-89');
		});

		await step('extra digits do not shift into the fixed country code', async () => {
			await userEvent.keyboard('777');
			await expect(input).toHaveValue('+7(912)345-67-89');
		});
	},
};

export const AsField: Story = {
	render: () => (
		<RuiField name="email" rules={{ required: 'Email is required' }}>
			<RuiLabel>Email</RuiLabel>
			<RuiInput type="email" placeholder="you@example.com" />
			<RuiFieldDescription>We never share your email.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
};

export const MaskedAsField: Story = {
	render: () => (
		<RuiField name="phone" rules={{ required: 'Phone is required' }}>
			<RuiLabel>Phone</RuiLabel>
			<RuiInput mask="+{7}(000)000-00-00" name="phone" />
			<RuiFieldDescription>Russian mobile format via the `mask` prop.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
};
