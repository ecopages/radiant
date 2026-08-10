import { RuiField, RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type FieldArgs = {
	name: string;
	disabled: boolean;
	invalid: boolean;
	error: string;
};

export const meta = {
	args: {
		name: 'email',
		disabled: false,
		invalid: false,
		error: '',
	},
	argTypes: {
		name: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		invalid: { control: { type: 'boolean' } },
		error: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiField name={args.name} disabled={args.disabled} invalid={args.invalid} error={args.error || undefined}>
			<RuiLabel>Email</RuiLabel>
			<RuiInput type="email" placeholder="you@example.com" />
			<RuiFieldDescription>We will never share your email.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
} satisfies DocsMeta<FieldArgs>;

type Story = DocsStory<FieldArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'field/default' } } });
