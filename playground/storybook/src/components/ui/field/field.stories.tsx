import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, within } from 'storybook/test';
import { RuiField, RuiFieldDescription, RuiFieldError } from './index';
import { RuiInput } from '../input';
import { RuiLabel } from '../label';

const meta = {
	title: 'Components/Field',
	component: RuiField,
} satisfies Meta<typeof RuiField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standalone: Story = {
	render: () => (
		<RuiField name="email" error="Enter a valid email" invalid>
			<RuiLabel>Email</RuiLabel>
			<RuiInput type="email" />
			<RuiFieldDescription>Standalone field without a form provider.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const input = canvasElement.querySelector('input[data-rui-control]') as HTMLInputElement;

		await step('standalone error prop surfaces in UI and ARIA', async () => {
			await expect(canvas.getByText('Enter a valid email')).toBeVisible();
			await expect(input).toHaveAttribute('aria-invalid', 'true');
		});
	},
};
