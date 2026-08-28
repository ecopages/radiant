import { RuiAutocomplete, RuiAutocompleteCollection, RuiAutocompleteEmpty } from '@ecopages/radiant-ui/autocomplete';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiListbox, RuiListboxOption } from '@ecopages/radiant-ui/listbox';
import {
	RuiSelect,
	RuiSelectClear,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectSearch,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
	type RuiSelectSelectionMode,
} from '@ecopages/radiant-ui/select';
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
			control: { type: 'radio' },
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

export const Multiple: Story = docsStory(meta, {
	args: {
		value: 'cat,dog',
		placeholder: 'Select animals',
		selectionMode: 'multiple',
	},
	parameters: { docs: { id: 'select/multiple' } },
});

export const Searchable: Story = docsStory(meta, {
	render: () => (
		<RuiField name="preview">
			<RuiLabel>Category</RuiLabel>
			<RuiSelect placeholder="Select a category">
				<RuiSelectControl>
					<RuiSelectTrigger>
						<RuiSelectValue />
					</RuiSelectTrigger>
					<RuiSelectClear aria-label="Clear category selection" />
					<RuiSelectToggle />
				</RuiSelectControl>
				<RuiSelectListbox>
					<RuiAutocomplete>
						<RuiSelectSearch aria-label="Search categories" placeholder="Search categories" />
						<RuiAutocompleteCollection>
							<RuiListbox embedded>
								<RuiListboxOption value="news">News</RuiListboxOption>
								<RuiListboxOption value="travel">Travel</RuiListboxOption>
								<RuiListboxOption value="shopping">Shopping</RuiListboxOption>
								<RuiListboxOption value="business">Business</RuiListboxOption>
								<RuiListboxOption value="food">Food</RuiListboxOption>
							</RuiListbox>
							<RuiAutocompleteEmpty>No results.</RuiAutocompleteEmpty>
						</RuiAutocompleteCollection>
					</RuiAutocomplete>
				</RuiSelectListbox>
			</RuiSelect>
		</RuiField>
	),
	parameters: { docs: { id: 'select/searchable' } },
});
