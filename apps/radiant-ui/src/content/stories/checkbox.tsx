import { RuiCheckbox } from '@ecopages/radiant-ui/checkbox';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type CheckboxArgs = {
	checked: boolean;
	indeterminate: boolean;
	disabled: boolean;
	value: string;
};

export const meta = {
	args: {
		checked: false,
		indeterminate: false,
		disabled: false,
		value: 'on',
	},
	argTypes: {
		checked: { control: { type: 'boolean' } },
		indeterminate: { control: { type: 'boolean' } },
		disabled: { control: { type: 'boolean' } },
		value: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiCheckbox checked={args.checked} indeterminate={args.indeterminate} disabled={args.disabled} value={args.value}>
			Email me product updates
		</RuiCheckbox>
	),
} satisfies DocsMeta<CheckboxArgs>;

type Story = DocsStory<CheckboxArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'checkbox/default' } } });
