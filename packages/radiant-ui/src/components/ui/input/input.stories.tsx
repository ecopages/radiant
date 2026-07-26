import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiLabel } from '../label';
import { RuiInput } from './input';

const meta = {
	title: 'Components/Input',
	component: RuiInput,
	args: {
		placeholder: 'Enter text',
		size: 'md',
	},
} satisfies Meta<typeof RuiInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

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
