import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiLabel } from '../label';
import { RuiListbox, RuiListboxOption, RuiListboxOptionIndicator } from './listbox';
import { RuiListbox as RuiListboxElement } from './listbox.script';

const meta = {
	title: 'Components/Listbox',
	component: RuiListbox,
	parameters: { radiant: { element: RuiListboxElement, cssImports: ['./listbox.css', '../label/label.css'] } },
	args: {
		label: 'Favorite fruit',
		value: 'apple',
		options: [
			{ value: 'apple', label: 'Apple' },
			{ value: 'banana', label: 'Banana' },
			{ value: 'cherry', label: 'Cherry' },
		],
	},
} satisfies Meta<typeof RuiListbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const options = Array.from(canvasElement.querySelectorAll('[role="option"]')) as HTMLElement[];
		await step('selects an option on click', async () => {
			await userEvent.click(options[2]);
			await expect(options[2]).toHaveAttribute('aria-selected', 'true');
			await expect(canvasElement.querySelector('rui-listbox')).toHaveAttribute('value', 'cherry');
		});
	},
};

export const Multiple: Story = {
	args: {
		selectionMode: 'multiple',
		value: ['apple'],
	},
	play: async ({ canvasElement, step }) => {
		const options = Array.from(canvasElement.querySelectorAll('[role="option"]')) as HTMLElement[];
		const listbox = canvasElement.querySelector('rui-listbox');
		await step('exposes multi-select semantics and toggles options', async () => {
			await expect(canvasElement.querySelector('[role="listbox"]')).toHaveAttribute(
				'aria-multiselectable',
				'true',
			);
			await userEvent.click(options[1]);
			await expect(listbox).toHaveAttribute('value', 'apple,banana');
			await userEvent.click(options[0]);
			await expect(listbox).toHaveAttribute('value', 'banana');
		});
	},
};

export const CustomIndicator: Story = {
	render: () => (
		<RuiListbox selectionMode="multiple" value={['apple']} label="Favorite fruit">
			<RuiListboxOption value="apple">
				Apple
				<RuiListboxOptionIndicator>
					<span data-custom-selection-indicator>Selected</span>
				</RuiListboxOptionIndicator>
			</RuiListboxOption>
			<RuiListboxOption value="banana">
				Banana
				<RuiListboxOptionIndicator>
					<span data-custom-selection-indicator>Selected</span>
				</RuiListboxOptionIndicator>
			</RuiListboxOption>
		</RuiListbox>
	),
	play: async ({ canvasElement, step }) => {
		const options = Array.from(canvasElement.querySelectorAll('[role="option"]')) as HTMLElement[];

		await step('renders custom indicator content for the selected option', async () => {
			await expect(options[0].querySelector('[data-custom-selection-indicator]')).toHaveTextContent('Selected');
			await expect(options[0]).toHaveAttribute('aria-selected', 'true');
		});

		await step('moves the indicator when selection changes', async () => {
			await userEvent.click(options[1]);
			await expect(options[1]).toHaveAttribute('aria-selected', 'true');
		});
	},
};

export const AsField: Story = {
	render: () => (
		<RuiField name="framework" rules={{ required: 'Pick a framework' }}>
			<RuiLabel>Framework</RuiLabel>
			<RuiListbox
				options={[
					{ value: 'radiant', label: 'Radiant' },
					{ value: 'react', label: 'React' },
				]}
			/>
			<RuiFieldDescription>Used for your project starter.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
};
