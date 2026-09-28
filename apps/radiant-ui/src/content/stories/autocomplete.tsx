import {
	RuiAutocomplete,
	RuiAutocompleteCollection,
	RuiAutocompleteEmpty,
	RuiAutocompleteInput,
} from '@ecopages/radiant-ui/autocomplete';
import { RuiListbox } from '@ecopages/radiant-ui/listbox';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

const AUTOCOMPLETE_DEMO_OPTIONS = [
	{ value: 'news', label: 'News' },
	{ value: 'travel', label: 'Travel' },
	{ value: 'shopping', label: 'Shopping' },
	{ value: 'business', label: 'Business' },
	{ value: 'entertainment', label: 'Entertainment' },
	{ value: 'food', label: 'Food' },
	{ value: 'technology', label: 'Technology' },
	{ value: 'health', label: 'Health' },
	{ value: 'science', label: 'Science' },
];

export type AutocompleteArgs = {
	sensitivity: 'base' | 'accent' | 'case';
};

export const meta = {
	args: {
		sensitivity: 'base',
	},
	argTypes: {
		sensitivity: {
			control: { type: 'select' },
			options: ['base', 'accent', 'case'] as const satisfies readonly AutocompleteArgs['sensitivity'][],
		},
	},
	render: (args) => (
		<div class="flex w-64 max-w-full flex-col gap-2">
			<RuiAutocomplete sensitivity={args.sensitivity}>
				<RuiAutocompleteInput aria-label="Search tags" placeholder="Search tags" class="mb-2" />
				<RuiAutocompleteCollection>
					<RuiListbox label="Tags" options={AUTOCOMPLETE_DEMO_OPTIONS} />
					<RuiAutocompleteEmpty>No matches found.</RuiAutocompleteEmpty>
				</RuiAutocompleteCollection>
			</RuiAutocomplete>
		</div>
	),
} satisfies DocsMeta<AutocompleteArgs>;

type Story = DocsStory<AutocompleteArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'autocomplete/default' } } });
