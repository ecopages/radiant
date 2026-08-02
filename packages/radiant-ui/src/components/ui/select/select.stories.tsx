import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { isStaticSsrPreview } from '@/lib/storybook-ssr';
import { RuiAutocomplete, RuiAutocompleteCollection, RuiAutocompleteEmpty } from '../autocomplete';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiLabel } from '../label';
import { RuiTagGroup, RuiTagList } from '../tag-group';
import { RuiListbox, RuiListboxOption } from '../listbox';
import {
	RuiSelect,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectSearch,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
} from './select';

const ANIMAL_OPTIONS = [
	{ value: 'aardvark', label: 'Aardvark' },
	{ value: 'cat', label: 'Cat' },
	{ value: 'dog', label: 'Dog' },
	{ value: 'kangaroo', label: 'Kangaroo' },
	{ value: 'panda', label: 'Panda' },
	{ value: 'snake', label: 'Snake' },
];

const meta = {
	title: 'Components/Select',
	component: RuiSelect,
	args: {
		placeholder: 'Select an animal',
		options: ANIMAL_OPTIONS,
	},
	render: (args) => (
		<div class="flex flex-col gap-2">
			<RuiLabel>Animal</RuiLabel>
			<RuiSelect {...args} />
		</div>
	),
} satisfies Meta<typeof RuiSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const getTrigger = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('[data-select-trigger]') as HTMLButtonElement;
const getListbox = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('[data-select-listbox]') as HTMLElement;
const getSearchInput = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('[data-autocomplete-input]') as HTMLInputElement;
const getOptions = (canvasElement: HTMLElement) =>
	Array.from(canvasElement.querySelectorAll('[data-select-listbox] [role="option"]')) as HTMLElement[];
const getVisibleOptions = (canvasElement: HTMLElement) =>
	getOptions(canvasElement).filter((option) => !option.hidden);
const getValue = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('[data-select-value]') as HTMLElement;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement) || !getTrigger(canvasElement)) return;

		const trigger = getTrigger(canvasElement);
		const options = getOptions(canvasElement);
		const listbox = getListbox(canvasElement);

		await step('click opens the listbox', async () => {
			await userEvent.click(trigger);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await expect(listbox).not.toHaveAttribute('hidden');
		});

		await step('selecting an option updates the value and closes', async () => {
			await userEvent.click(options[1]);
			await expect(getValue(canvasElement)).toHaveTextContent('Cat');
			await expect(canvasElement.querySelector('rui-select')).toHaveAttribute('value', 'cat');
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});
	},
};

export const Keyboard: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement) || !getTrigger(canvasElement)) return;

		const trigger = getTrigger(canvasElement);
		const options = getOptions(canvasElement);

		await step('ArrowDown opens and highlights the first option', async () => {
			trigger.focus();
			await userEvent.keyboard('{ArrowDown}');
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await expect(trigger).toHaveAttribute('aria-activedescendant', options[0].id);
		});

		await step('Enter selects the active option', async () => {
			await userEvent.keyboard('{Enter}');
			await expect(getValue(canvasElement)).toHaveTextContent('Aardvark');
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});
	},
};

export const Multiple: Story = {
	args: {
		selectionMode: 'multiple',
		placeholder: 'Select animals',
	},
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement) || !getTrigger(canvasElement)) return;

		const trigger = getTrigger(canvasElement);
		const options = getOptions(canvasElement);

		await step('selecting multiple options keeps the popup open', async () => {
			await userEvent.click(trigger);
			await userEvent.click(options[0]);
			await userEvent.click(options[2]);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await expect(canvasElement.querySelector('rui-select')).toHaveAttribute('value', 'aardvark,dog');
			await expect(options[0]).toHaveAttribute('aria-selected', 'true');
			await expect(options[2]).toHaveAttribute('aria-selected', 'true');
		});
	},
};

export const WithAutocomplete: Story = {
	render: () => (
		<div class="flex flex-col gap-2">
			<RuiLabel>Category</RuiLabel>
			<RuiSelect placeholder="Select a category">
				<RuiSelectControl>
					<RuiSelectTrigger>
						<RuiSelectValue />
					</RuiSelectTrigger>
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
		</div>
	),
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement) || !getTrigger(canvasElement)) return;

		const trigger = getTrigger(canvasElement);
		const search = getSearchInput(canvasElement);
		const select = canvasElement.querySelector('rui-select') as HTMLElement;

		await step('opening focuses the search input', async () => {
			await userEvent.click(trigger);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await expect(search).toHaveFocus();
			await expect(search).toHaveAttribute('role', 'combobox');
			await expect(search).toHaveAttribute('aria-expanded', 'true');
		});

		await step('typing filters options', async () => {
			await userEvent.type(search, 'foo');
			const visible = getVisibleOptions(canvasElement);
			await expect(visible).toHaveLength(1);
			await expect(visible[0]).toHaveTextContent('Food');
		});

		await step('ArrowDown highlights the first visible option', async () => {
			await userEvent.keyboard('{ArrowDown}');
			const visible = getVisibleOptions(canvasElement);
			await expect(visible[0]).toHaveAttribute('data-active', 'true');
			await expect(search).toHaveAttribute('aria-activedescendant', visible[0].id);
		});

		await step('Enter selects the active option and closes', async () => {
			await userEvent.keyboard('{Enter}');
			await expect(getValue(canvasElement)).toHaveTextContent('Food');
			await expect(select).toHaveAttribute('value', 'food');
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
			await expect(search).not.toHaveAttribute('aria-activedescendant');
		});

		await step('Escape closes without changing the selection', async () => {
			await userEvent.click(trigger);
			await userEvent.type(search, 'tra');
			const visible = getVisibleOptions(canvasElement);
			await expect(visible).toHaveLength(1);
			await expect(visible[0]).toHaveTextContent('Travel');
			await userEvent.keyboard('{ArrowDown}');
			await expect(visible[0]).toHaveAttribute('data-active', 'true');
			await userEvent.keyboard('{Escape}');
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
			await expect(trigger).toHaveFocus();
			await expect(select).toHaveAttribute('value', 'food');
			await expect(getValue(canvasElement)).toHaveTextContent('Food');
		});
	},
};

export const WithTagGroup: Story = {
	render: () => (
		<div class="flex flex-col gap-2">
			<RuiLabel>States</RuiLabel>
			<RuiSelect selectionMode="multiple" placeholder="Select states">
				<RuiSelectControl>
					<RuiSelectTrigger>
						<RuiSelectValue>
							<RuiTagGroup label="Selected states">
								<RuiTagList />
							</RuiTagGroup>
						</RuiSelectValue>
					</RuiSelectTrigger>
					<RuiSelectToggle />
				</RuiSelectControl>
				<RuiSelectListbox>
					<RuiAutocomplete>
						<RuiSelectSearch aria-label="Search states" placeholder="Search states" />
						<RuiAutocompleteCollection>
							<RuiListbox embedded>
								<RuiListboxOption value="ca">California</RuiListboxOption>
								<RuiListboxOption value="ny">New York</RuiListboxOption>
								<RuiListboxOption value="tx">Texas</RuiListboxOption>
								<RuiListboxOption value="wa">Washington</RuiListboxOption>
							</RuiListbox>
							<RuiAutocompleteEmpty>No results.</RuiAutocompleteEmpty>
						</RuiAutocompleteCollection>
					</RuiAutocomplete>
				</RuiSelectListbox>
			</RuiSelect>
		</div>
	),
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement) || !getTrigger(canvasElement)) return;

		const trigger = getTrigger(canvasElement);
		const search = getSearchInput(canvasElement);
		const select = canvasElement.querySelector('rui-select') as HTMLElement;
		const tagGroup = canvasElement.querySelector('rui-tag-group') as HTMLElement;
		const getTags = () =>
			Array.from(canvasElement.querySelectorAll('[data-select-value] [data-tag]')) as HTMLElement[];
		const getVisibleTags = () => getTags().filter((tag) => !tag.hidden);

		await step('selecting options from the listbox adds tags', async () => {
			await userEvent.click(trigger);
			const options = getOptions(canvasElement);
			await userEvent.click(options[0]);
			await userEvent.click(options[2]);
			await expect(select).toHaveAttribute('value', 'ca,tx');
			await expect(tagGroup).toHaveAttribute('value', 'ca,tx');
			await expect(getVisibleTags()).toHaveLength(2);
			await expect(getVisibleTags()[0]).toHaveTextContent('California');
			await expect(getVisibleTags()[1]).toHaveTextContent('Texas');
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
		});

		await step('removing a tag updates the select value', async () => {
			const californiaTag = getVisibleTags().find((tag) => tag.getAttribute('data-value') === 'ca');
			const remove = californiaTag?.querySelector('[data-tag-remove]') as HTMLButtonElement;
			await userEvent.click(remove);
			await expect(select).toHaveAttribute('value', 'tx');
			await expect(tagGroup).toHaveAttribute('value', 'tx');
			await expect(getVisibleTags()).toHaveLength(1);
			await expect(getVisibleTags()[0]).toHaveAttribute('data-value', 'tx');
		});

		await step('keyboard selection adds another tag', async () => {
			await userEvent.click(trigger);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			search.focus();
			await userEvent.clear(search);
			await userEvent.type(search, 'wash');
			const visible = getVisibleOptions(canvasElement);
			await expect(visible).toHaveLength(1);
			await userEvent.keyboard('{ArrowDown}');
			await userEvent.keyboard('{Enter}');
			await expect(select).toHaveAttribute('value', 'tx,wa');
			await expect(getVisibleTags()).toHaveLength(2);
			await expect(
				getVisibleTags().some((tag) => tag.getAttribute('data-value') === 'wa'),
			).toBe(true);
		});
	},
};

export const AsField: Story = {
	render: () => (
		<RuiField name="animal" rules={{ required: 'Choose an animal' }}>
			<RuiLabel>Animal</RuiLabel>
			<RuiSelect placeholder="Select an animal" options={ANIMAL_OPTIONS} />
			<RuiFieldDescription>Used for your profile.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
};
