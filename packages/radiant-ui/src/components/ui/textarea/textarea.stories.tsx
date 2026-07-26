import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiLabel } from '../label';
import { RuiTextarea } from './textarea';

const meta = {
	title: 'Components/Textarea',
	component: RuiTextarea,
	args: {
		placeholder: 'Write something…',
		rows: 4,
	},
} satisfies Meta<typeof RuiTextarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AsField: Story = {
	render: () => (
		<RuiField name="bio" rules={{ minLength: { value: 10, message: 'At least 10 characters' } }}>
			<RuiLabel>Bio</RuiLabel>
			<RuiTextarea rows={4} placeholder="Tell us about yourself" />
			<RuiFieldDescription>A short introduction for your profile.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
};
