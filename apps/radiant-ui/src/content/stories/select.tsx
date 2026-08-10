import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiSelect, type RuiSelectSelectionMode } from '@ecopages/radiant-ui/select';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { ANIMAL_OPTIONS } from './demo-data';

export type SelectArgs = {
	value: string;
	placeholder: string;
	disabled: boolean;
	selectionMode: RuiSelectSelectionMode;
};

export const meta = {
	args: {
		value: 'cat',
		placeholder: 'Select an animal',
		disabled: false,
		selectionMode: 'single',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		placeholder: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		selectionMode: {
			control: { type: 'select' },
			options: ['single', 'multiple'] as const satisfies readonly RuiSelectSelectionMode[],
		},
	},
	render: (args) => (
		<RuiField name="preview">
			<RuiLabel>Animal</RuiLabel>
			<RuiSelect
				value={args.value}
				placeholder={args.placeholder}
				disabled={args.disabled}
				selectionMode={args.selectionMode}
				options={ANIMAL_OPTIONS}
			/>
		</RuiField>
	),
} satisfies DocsMeta<SelectArgs>;

type Story = DocsStory<SelectArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'select/default' } } });
