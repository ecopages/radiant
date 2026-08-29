import { RuiCombobox, type RuiComboboxSelectionMode, type RuiComboboxTriggerKind } from '@ecopages/radiant-ui/combobox';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { ANIMAL_OPTIONS } from './demo-data';

export type ComboboxArgs = {
	value: string;
	placeholder: string;
	disabled: boolean;
	selectionMode: RuiComboboxSelectionMode;
	triggerKind: RuiComboboxTriggerKind;
};

export const meta = {
	args: {
		value: '',
		placeholder: 'Choose an animal',
		disabled: false,
		selectionMode: 'single',
		triggerKind: 'input',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		placeholder: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		selectionMode: {
			control: { type: 'radio' },
			options: ['single', 'multiple'] as const satisfies readonly RuiComboboxSelectionMode[],
		},
		triggerKind: { control: { type: 'select' }, options: ['input', 'focus', 'manual'] },
	},
	render: (args) => (
		<RuiCombobox
			value={args.value}
			placeholder={args.placeholder}
			disabled={args.disabled}
			selectionMode={args.selectionMode}
			triggerKind={args.triggerKind}
			options={ANIMAL_OPTIONS}
		/>
	),
} satisfies DocsMeta<ComboboxArgs>;

type Story = DocsStory<ComboboxArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'combobox/default' } } });

export const Multiple: Story = docsStory(meta, {
	args: {
		value: 'cat,dog',
		placeholder: 'Choose animals',
		selectionMode: 'multiple',
	},
	parameters: { docs: { id: 'combobox/multiple' } },
});

export const TriggerKindManual: Story = docsStory(meta, {
	args: { triggerKind: 'manual' },
	parameters: { docs: { id: 'combobox/trigger-kind-manual' } },
});
