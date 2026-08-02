import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { isStaticSsrPreview } from '@/lib/storybook-ssr';
import '../menu-button/menu-button.script';
import { RuiLabel } from '../label';
import { RuiListbox } from '../listbox';
import {
	RuiSelect,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectSearch,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
} from '../select';
import { RuiTagGroup } from '../tag-group';
import { RuiAutocomplete, RuiAutocompleteCollection, RuiAutocompleteEmpty, RuiAutocompleteInput } from './autocomplete';

const TAG_OPTIONS = [
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

const STATE_OPTIONS = [
	{ value: 'ca', label: 'California' },
	{ value: 'co', label: 'Colorado' },
	{ value: 'ny', label: 'New York' },
	{ value: 'tx', label: 'Texas' },
	{ value: 'wa', label: 'Washington' },
];

const MENU_TAGS = [
	{ value: 'news', label: 'News' },
	{ value: 'travel', label: 'Travel' },
	{ value: 'shopping', label: 'Shopping' },
	{ value: 'business', label: 'Business' },
	{ value: 'food', label: 'Food' },
];

const meta = {
	title: 'Components/Autocomplete',
	component: RuiAutocomplete,
	parameters: {
		docs: {
			description: {
				component:
					'Filters a collection from a search field. Compose with Listbox, Select, TagGroup, Menu, or Combobox — see [React Aria Autocomplete](https://react-aria.adobe.com/Autocomplete).',
			},
		},
	},
} satisfies Meta<typeof RuiAutocomplete>;

export default meta;
type Story = StoryObj<typeof meta>;

const getInput = (root: HTMLElement) => root.querySelector('[data-autocomplete-input]') as HTMLInputElement;
const getOptions = (root: HTMLElement) => Array.from(root.querySelectorAll('[role="option"]')) as HTMLElement[];
const getVisibleOptions = (root: HTMLElement) => getOptions(root).filter((option) => !option.hidden);
const getTags = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-tag]')) as HTMLElement[];
const getVisibleTags = (root: HTMLElement) => getTags(root).filter((tag) => !tag.hidden);
const getEmptyState = (root: HTMLElement) => root.querySelector('[data-autocomplete-empty]') as HTMLElement;

/**
 * Mirrors the React Aria ListBox example — filter a standalone list from a search field.
 */
export const WithListbox: Story = {
	render: () => (
		<div class="flex w-64 flex-col gap-2">
			<RuiLabel>Tags</RuiLabel>
			<RuiAutocomplete>
				<RuiAutocompleteInput aria-label="Search tags" placeholder="Search tags" class="mb-2 w-full" />
				<RuiAutocompleteCollection>
					<RuiListbox label="Tags" options={TAG_OPTIONS} />
					<RuiAutocompleteEmpty>No results.</RuiAutocompleteEmpty>
				</RuiAutocompleteCollection>
			</RuiAutocomplete>
		</div>
	),
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;

		const input = getInput(canvasElement);

		await step('typing filters options with case-insensitive contains', async () => {
			input.focus();
			await userEvent.type(input, 'foo');
			const visible = getVisibleOptions(canvasElement);
			await expect(visible).toHaveLength(1);
			await expect(visible[0]).toHaveTextContent('Food');
		});

		await step('empty state appears when nothing matches', async () => {
			await userEvent.clear(input);
			await userEvent.type(input, 'zzzz');
			await expect(getVisibleOptions(canvasElement)).toHaveLength(0);
			await expect(getEmptyState(canvasElement)).not.toHaveAttribute('hidden');
		});

		await step('clearing the query shows all options again', async () => {
			await userEvent.clear(input);
			await expect(getVisibleOptions(canvasElement)).toHaveLength(TAG_OPTIONS.length);
			await expect(getEmptyState(canvasElement)).toHaveAttribute('hidden');
		});
	},
};

/**
 * Mirrors the React Aria TagGroup example — filter selectable tags from a search field.
 */
export const WithTagGroup: Story = {
	render: () => (
		<div class="flex w-64 flex-col gap-2">
			<RuiAutocomplete>
				<RuiAutocompleteInput aria-label="Interests" placeholder="Filter tags" class="mb-4 w-full" />
				<RuiAutocompleteCollection>
					<RuiTagGroup label="Interest tags" selectionMode="multiple" tags={TAG_OPTIONS} />
					<RuiAutocompleteEmpty>No results.</RuiAutocompleteEmpty>
				</RuiAutocompleteCollection>
			</RuiAutocomplete>
		</div>
	),
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;

		const input = getInput(canvasElement);
		const tagGroup = canvasElement.querySelector('rui-tag-group') as HTMLElement;

		await step('filtering hides non-matching tags', async () => {
			input.focus();
			await userEvent.type(input, 'tech');
			await expect(getVisibleTags(canvasElement)).toHaveLength(1);
			await expect(getVisibleTags(canvasElement)[0]).toHaveTextContent('Technology');
		});

		await step('visible tags remain selectable', async () => {
			await userEvent.click(getVisibleTags(canvasElement)[0]);
			await expect(tagGroup).toHaveAttribute('value', 'technology');
		});
	},
};

/**
 * Mirrors the React Aria Select example — filter options inside a select popup.
 */
export const WithSelect: Story = {
	render: () => (
		<div class="flex w-64 flex-col gap-2">
			<RuiLabel>State</RuiLabel>
			<RuiSelect placeholder="Select a state">
				<RuiSelectControl>
					<RuiSelectTrigger>
						<RuiSelectValue />
					</RuiSelectTrigger>
					<RuiSelectToggle />
				</RuiSelectControl>
				<RuiSelectListbox>
					<RuiAutocomplete>
						<RuiSelectSearch aria-label="Search states" placeholder="Search states" />
						<RuiAutocompleteCollection>
							<RuiListbox embedded options={STATE_OPTIONS} />
							<RuiAutocompleteEmpty>No results.</RuiAutocompleteEmpty>
						</RuiAutocompleteCollection>
					</RuiAutocomplete>
				</RuiSelectListbox>
			</RuiSelect>
		</div>
	),
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;

		const trigger = canvasElement.querySelector('[data-select-trigger]') as HTMLButtonElement;
		const search = getInput(canvasElement);

		await step('search inside the select popup filters states', async () => {
			await userEvent.click(trigger);
			await expect(search).toHaveFocus();
			await userEvent.type(search, 'cali');
			const visible = getVisibleOptions(canvasElement);
			await expect(visible).toHaveLength(1);
			await expect(visible[0]).toHaveTextContent('California');
		});

		await step('selecting a filtered option updates the value', async () => {
			await userEvent.click(getVisibleOptions(canvasElement)[0]);
			await expect(canvasElement.querySelector('rui-select')).toHaveAttribute('value', 'ca');
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});
	},
};

/**
 * Mirrors the React Aria Menu example — filter menu items from a search field in the popup.
 */
export const WithMenu: Story = {
	render: () => (
		<rui-menu-button>
			<span slot="trigger">Add tag…</span>
			<div class="flex max-h-64 flex-col">
				<RuiAutocomplete>
					<RuiAutocompleteInput
						aria-label="Search tags"
						placeholder="Search tags"
						class="m-1 w-[calc(100%-0.5rem)]"
					/>
					<RuiAutocompleteCollection class="flex-1 overflow-auto">
						{MENU_TAGS.map((tag) => (
							<button
								type="button"
								class="rui-menu-button__item"
								role="menuitem"
								data-value={tag.value}
								tabindex={-1}
							>
								{tag.label}
							</button>
						))}
						<RuiAutocompleteEmpty>No results.</RuiAutocompleteEmpty>
					</RuiAutocompleteCollection>
				</RuiAutocomplete>
			</div>
		</rui-menu-button>
	),
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;

		const trigger = canvasElement.querySelector('[data-ref="trigger"]') as HTMLButtonElement;
		const host = canvasElement.querySelector('rui-menu-button') as HTMLElement;
		const input = getInput(canvasElement);

		await step('opening the menu and typing filters items', async () => {
			await userEvent.click(trigger);
			input.focus();
			await userEvent.type(input, 'foo');
			const items = Array.from(canvasElement.querySelectorAll('[role="menuitem"]')) as HTMLElement[];
			const visible = items.filter((item) => !item.hidden);
			await expect(visible).toHaveLength(1);
			await expect(visible[0]).toHaveTextContent('Food');
		});

		await step('selecting a filtered item emits the value', async () => {
			const emissions: string[] = [];
			host.addEventListener('rui-change', (event) =>
				emissions.push((event as CustomEvent<{ value: string }>).detail.value),
			);
			const items = Array.from(canvasElement.querySelectorAll('[role="menuitem"]')) as HTMLElement[];
			const food = items.find((item) => item.getAttribute('data-value') === 'food');
			await userEvent.click(food!);
			await expect(emissions).toEqual(['food']);
		});
	},
};
