import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { isStaticSsrPreview } from '@/lib/storybook-ssr';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiLabel } from '../label';
import { RuiAutocomplete, RuiAutocompleteCollection, RuiAutocompleteEmpty } from '../autocomplete';
import { RuiListbox, RuiListboxOption } from '../listbox';
import { RuiCombobox, RuiComboboxControl, RuiComboboxInput, RuiComboboxListbox, RuiComboboxTrigger } from './combobox';

const COUNTRY_OPTIONS = [
	{ value: 'at', label: 'Austria' },
	{ value: 'de', label: 'Germany' },
	{ value: 'it', label: 'Italy' },
];

const meta = {
	title: 'Components/Combobox',
	component: RuiCombobox,
	args: {
		placeholder: 'Choose a country',
		options: COUNTRY_OPTIONS,
	},
	render: (args) => (
		<div class="flex flex-col gap-2">
			<RuiLabel>Country</RuiLabel>
			<RuiCombobox {...args} />
		</div>
	),
} satisfies Meta<typeof RuiCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

const getInput = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('[data-combobox-input]') as HTMLInputElement;
const getListboxPopup = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('[data-combobox-listbox]') as HTMLElement;
const getOptions = (canvasElement: HTMLElement) =>
	Array.from(canvasElement.querySelectorAll('[data-combobox-listbox] [role="option"]')) as HTMLElement[];
const getTrigger = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('[data-combobox-trigger]') as HTMLButtonElement;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement) || !getInput(canvasElement)) return;

		const input = getInput(canvasElement);
		const options = getOptions(canvasElement);
		const listboxPopup = getListboxPopup(canvasElement);

		await step('focus keeps the listbox closed by default', async () => {
			await waitFor(() => {
				expect(getOptions(canvasElement).length).toBeGreaterThan(0);
			});
			input.focus();
			await expect(input).toHaveAttribute('aria-expanded', 'false');
			await expect(document.activeElement).toBe(input);
			await expect(input).not.toHaveAttribute('aria-activedescendant');
			await expect(listboxPopup).toHaveAttribute('hidden');
		});

		await step('ArrowDown opens the listbox and jumps visual focus to the first option', async () => {
			await userEvent.keyboard('{ArrowDown}');
			await expect(document.activeElement).toBe(input);
			await expect(input).toHaveAttribute('aria-expanded', 'true');
			await expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
			await expect(options[0]).toHaveAttribute('data-active');
			await expect(options[0]).toHaveAttribute('aria-selected', 'false');
		});

		await step('ArrowDown moves to the next option without moving DOM focus', async () => {
			await userEvent.keyboard('{ArrowDown}');
			await expect(document.activeElement).toBe(input);
			await expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
		});

		await step('typing filters options with contains matching', async () => {
			input.focus();
			await userEvent.type(input, 'erm');
			const visible = getOptions(canvasElement).filter((option) => !option.hidden);
			await expect(visible).toHaveLength(1);
			await expect(visible[0]).toHaveTextContent('Germany');
		});

		await step('selecting a filtered option updates the value and closes the popup', async () => {
			const visible = getOptions(canvasElement).filter((option) => !option.hidden);
			await userEvent.click(visible[0]);
			await expect(input).toHaveValue('Germany');
			await expect(canvasElement.querySelector('rui-combobox')).toHaveAttribute('value', 'de');
			await expect(input).toHaveAttribute('aria-expanded', 'false');
			await expect(listboxPopup).toHaveAttribute('hidden');
		});
	},
};

export const OpenOnFocus: Story = {
	args: {
		openOnFocus: true,
	},
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement) || !getInput(canvasElement)) return;

		const input = getInput(canvasElement);
		const options = getOptions(canvasElement);

		await step('focus opens the listbox without moving visual focus into it', async () => {
			input.focus();
			await expect(input).toHaveAttribute('aria-expanded', 'true');
			await expect(input).not.toHaveAttribute('aria-activedescendant');
		});

		await step('ArrowDown jumps visual focus onto the first option', async () => {
			await userEvent.keyboard('{ArrowDown}');
			await expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
			await expect(options[0]).toHaveAttribute('data-active');
		});
	},
};

export const Keyboard: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement) || !getInput(canvasElement)) return;

		const input = getInput(canvasElement);
		const options = getOptions(canvasElement);

		await step('ArrowDown then Enter selects the active option and closes', async () => {
			input.focus();
			// First ArrowDown opens + activates Austria; second moves to Germany.
			await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
			await expect(input).toHaveValue('Germany');
			await expect(input).toHaveAttribute('aria-expanded', 'false');
		});

		await step('Escape closes the popup without changing the value', async () => {
			input.focus();
			await userEvent.keyboard('{ArrowDown}{Escape}');
			await expect(input).toHaveAttribute('aria-expanded', 'false');
			await expect(input).toHaveValue('Germany');
			await expect(options[0]).not.toHaveAttribute('data-active');
			await expect(input).not.toHaveAttribute('aria-activedescendant');
		});

		await step('Home and End move the text caret, not list focus', async () => {
			input.focus();
			await userEvent.keyboard('{ArrowDown}');
			// Value is still Germany from the prior step — active option follows selection.
			await expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
			await userEvent.keyboard('{Home}');
			await expect(input).not.toHaveAttribute('aria-activedescendant');
			await expect(input.selectionStart).toBe(0);
		});
	},
};

export const Composed: Story = {
	render: () => (
		<div class="flex flex-col gap-2">
			<RuiLabel>Fruit</RuiLabel>
			<RuiCombobox placeholder="Search fruit">
				<RuiComboboxControl>
					<RuiComboboxInput placeholder="Search fruit" />
					<RuiComboboxTrigger aria-label="Show fruit suggestions" />
				</RuiComboboxControl>
				<RuiComboboxListbox>
					<RuiAutocomplete>
						<RuiAutocompleteCollection>
							<RuiListbox embedded>
								<RuiListboxOption value="apple" label="Apple">
									<span class="flex items-center gap-2">
										<span aria-hidden="true">🍎</span>
										Apple
									</span>
								</RuiListboxOption>
								<RuiListboxOption value="banana" label="Banana">
									<span class="flex items-center gap-2">
										<span aria-hidden="true">🍌</span>
										Banana
									</span>
								</RuiListboxOption>
								<RuiListboxOption value="cherry" label="Cherry">
									<span class="flex items-center gap-2">
										<span aria-hidden="true">🍒</span>
										Cherry
									</span>
								</RuiListboxOption>
							</RuiListbox>
							<RuiAutocompleteEmpty>No results found.</RuiAutocompleteEmpty>
						</RuiAutocompleteCollection>
					</RuiAutocomplete>
				</RuiComboboxListbox>
			</RuiCombobox>
		</div>
	),
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement) || !getInput(canvasElement)) return;

		const input = getInput(canvasElement);
		const options = getOptions(canvasElement);

		await step('trigger button toggles the popup', async () => {
			const trigger = getTrigger(canvasElement);
			await userEvent.click(trigger);
			await expect(input).toHaveAttribute('aria-expanded', 'true');
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await expect(input).not.toHaveAttribute('aria-activedescendant');
			await userEvent.click(trigger);
			await expect(input).toHaveAttribute('aria-expanded', 'false');
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});

		await step('selecting a decorated option closes the popup', async () => {
			input.focus();
			await userEvent.keyboard('{ArrowDown}');
			await userEvent.click(options[2]);
			await expect(input).toHaveValue('Cherry');
			await expect(input).toHaveAttribute('aria-expanded', 'false');
		});
	},
};

export const AsField: Story = {
	render: () => (
		<RuiField name="country" rules={{ required: 'Choose a country' }}>
			<RuiLabel>Country</RuiLabel>
			<RuiCombobox
				placeholder="Search countries"
				options={[
					{ value: 'de', label: 'Germany' },
					{ value: 'it', label: 'Italy' },
					{ value: 'at', label: 'Austria' },
				]}
			/>
			<RuiFieldDescription>Used for shipping and billing.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
};
