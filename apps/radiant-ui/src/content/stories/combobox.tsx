import { RuiCombobox } from '@ecopages/radiant-ui/combobox';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { ANIMAL_OPTIONS } from './demo-data';

export type ComboboxArgs = {
	value: string;
	placeholder: string;
	disabled: boolean;
	openOnFocus: boolean;
};

export const meta = {
	args: {
		value: '',
		placeholder: 'Choose an animal',
		disabled: false,
		openOnFocus: false,
	},
	argTypes: {
		value: { control: { type: 'text' } },
		placeholder: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		openOnFocus: { control: { type: 'boolean' } },
	},
	render: (args) => (
		<RuiCombobox
			value={args.value}
			placeholder={args.placeholder}
			disabled={args.disabled}
			openOnFocus={args.openOnFocus}
			options={ANIMAL_OPTIONS}
		/>
	),
} satisfies DocsMeta<ComboboxArgs>;

type Story = DocsStory<ComboboxArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'combobox/default' } } });
