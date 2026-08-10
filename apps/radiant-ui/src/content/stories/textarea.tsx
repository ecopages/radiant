import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiTextarea, type RuiTextareaSize } from '@ecopages/radiant-ui/textarea';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type TextareaArgs = {
	size: RuiTextareaSize;
	rows: number;
	disabled: boolean;
	placeholder: string;
};

export const meta = {
	args: {
		size: 'md',
		rows: 3,
		disabled: false,
		placeholder: 'Tell us about yourself',
	},
	argTypes: {
		size: {
			control: { type: 'select' },
			options: ['sm', 'md', 'lg'] as const satisfies readonly RuiTextareaSize[],
		},
		rows: { control: { type: 'number' } },
		disabled: { control: { type: 'boolean' } },
		placeholder: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiField name="preview">
			<RuiLabel>Bio</RuiLabel>
			<RuiTextarea size={args.size} rows={args.rows} disabled={args.disabled} placeholder={args.placeholder} />
		</RuiField>
	),
} satisfies DocsMeta<TextareaArgs>;

type Story = DocsStory<TextareaArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'textarea/default' } } });
