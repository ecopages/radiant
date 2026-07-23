import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import {
	RuiCombobox,
	RuiComboboxControl,
	RuiComboboxInput,
	RuiComboboxLabel,
	RuiComboboxListbox,
	RuiComboboxOption,
	RuiComboboxTrigger,
} from './combobox';

const meta = {
	title: 'Components/Combobox',
	component: RuiCombobox,
	args: {
		label: 'Country',
		placeholder: 'Choose a country',
		options: [
			{ value: 'at', label: 'Austria' },
			{ value: 'de', label: 'Germany' },
			{ value: 'it', label: 'Italy' },
		],
	},
} satisfies Meta<typeof RuiCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

const getInput = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('[data-combobox-input]') as HTMLInputElement;
const getListbox = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('[data-combobox-listbox]') as HTMLElement;
const getOptions = (canvasElement: HTMLElement) =>
	Array.from(canvasElement.querySelectorAll('[data-combobox-option]')) as HTMLElement[];

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const input = getInput(canvasElement);
		const options = getOptions(canvasElement);

		await step('focus opens the listbox and keeps focus on the input', async () => {
			input.focus();
			await expect(input).toHaveAttribute('aria-expanded', 'true');
			await expect(document.activeElement).toBe(input);
			await expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
			await expect(input).toHaveAttribute('aria-controls', getListbox(canvasElement).id);
		});

		await step('ArrowDown moves aria-activedescendant without moving DOM focus', async () => {
			await userEvent.keyboard('{ArrowDown}');
			await expect(document.activeElement).toBe(input);
			await expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
		});

		await step('selecting an option updates the value and closes the popup', async () => {
			await userEvent.click(options[1]);
			await expect(input).toHaveValue('Germany');
			await expect(canvasElement.querySelector('rui-combobox')).toHaveAttribute('value', 'de');
			await expect(input).toHaveAttribute('aria-expanded', 'false');
			await expect(getListbox(canvasElement)).toHaveAttribute('hidden');
		});
	},
};

export const Keyboard: Story = {
	play: async ({ canvasElement, step }) => {
		const input = getInput(canvasElement);
		const options = getOptions(canvasElement);

		await step('Enter selects the active option and closes the popup', async () => {
			input.focus();
			await userEvent.keyboard('{ArrowDown}{Enter}');
			await expect(input).toHaveValue('Germany');
			await expect(input).toHaveAttribute('aria-expanded', 'false');
		});

		await step('Escape closes the popup without changing the value', async () => {
			input.focus();
			await userEvent.keyboard('{ArrowDown}{Escape}');
			await expect(input).toHaveAttribute('aria-expanded', 'false');
			await expect(input).toHaveValue('Germany');
			await expect(options[1]).not.toHaveAttribute('data-active');
		});
	},
};

export const Composed: Story = {
	render: () => (
		<RuiCombobox label="Fruit" placeholder="Search fruit">
			<RuiComboboxLabel>Fruit</RuiComboboxLabel>
			<RuiComboboxControl>
				<RuiComboboxInput placeholder="Search fruit" />
				<RuiComboboxTrigger aria-label="Show fruit suggestions">
					<span aria-hidden="true" class="rui-combobox__trigger-icon">
						⌄
					</span>
				</RuiComboboxTrigger>
			</RuiComboboxControl>
			<RuiComboboxListbox>
				<RuiComboboxOption value="apple" label="Apple">
					<span class="flex items-center gap-2">
						<span aria-hidden="true">🍎</span>
						Apple
					</span>
				</RuiComboboxOption>
				<RuiComboboxOption value="banana" label="Banana">
					<span class="flex items-center gap-2">
						<span aria-hidden="true">🍌</span>
						Banana
					</span>
				</RuiComboboxOption>
				<RuiComboboxOption value="cherry" label="Cherry">
					<span class="flex items-center gap-2">
						<span aria-hidden="true">🍒</span>
						Cherry
					</span>
				</RuiComboboxOption>
			</RuiComboboxListbox>
		</RuiCombobox>
	),
	play: async ({ canvasElement, step }) => {
		const input = getInput(canvasElement);
		const options = getOptions(canvasElement);

		await step('trigger button toggles the popup', async () => {
			const trigger = canvasElement.querySelector('[data-combobox-trigger]') as HTMLButtonElement;
			await userEvent.click(trigger);
			await expect(input).toHaveAttribute('aria-expanded', 'true');
			await userEvent.click(trigger);
			await expect(input).toHaveAttribute('aria-expanded', 'false');
		});

		await step('selecting a decorated option closes the popup', async () => {
			input.focus();
			await userEvent.click(options[2]);
			await expect(input).toHaveValue('Cherry');
			await expect(input).toHaveAttribute('aria-expanded', 'false');
		});
	},
};
