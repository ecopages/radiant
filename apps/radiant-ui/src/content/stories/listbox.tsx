import { RuiListbox, type RuiListboxSelectionMode } from '@ecopages/radiant-ui/listbox';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { ANIMAL_OPTIONS } from './demo-data';

export type ListboxArgs = {
	value: string;
	disabled: boolean;
	embedded: boolean;
	label: string;
	selectionMode: RuiListboxSelectionMode;
};

export const meta = {
	args: {
		value: 'cat',
		disabled: false,
		embedded: false,
		label: 'Animal',
		selectionMode: 'single',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		embedded: { control: { type: 'boolean' } },
		label: { control: { type: 'text' } },
		selectionMode: {
			control: { type: 'radio' },
			options: ['single', 'multiple'] as const satisfies readonly RuiListboxSelectionMode[],
		},
	},
	render: (args) => (
		<RuiListbox
			value={args.value}
			disabled={args.disabled}
			embedded={args.embedded}
			label={args.label}
			selectionMode={args.selectionMode}
			options={ANIMAL_OPTIONS}
		/>
	),
} satisfies DocsMeta<ListboxArgs>;

type Story = DocsStory<ListboxArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'listbox/default' } } });

export const Multiple: Story = docsStory(meta, {
	args: {
		value: 'cat,dog',
		selectionMode: 'multiple',
	},
	parameters: { docs: { id: 'listbox/multiple' } },
});
