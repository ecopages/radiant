import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type InputArgs = {
	type: 'text' | 'email' | 'password' | 'number';
	disabled: boolean;
	placeholder: string;
};

export const meta = {
	args: {
		type: 'text',
		disabled: false,
		placeholder: 'you@example.com',
	},
	argTypes: {
		type: {
			control: { type: 'select' },
			options: ['text', 'email', 'password', 'number'] as const satisfies readonly InputArgs['type'][],
		},
		disabled: { control: { type: 'boolean' } },
		placeholder: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiField name="preview">
			<RuiLabel>Email</RuiLabel>
			<RuiInput type={args.type} disabled={args.disabled} placeholder={args.placeholder} />
		</RuiField>
	),
} satisfies DocsMeta<InputArgs>;

type Story = DocsStory<InputArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'input/default' } } });
