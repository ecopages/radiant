import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiLabel } from '../label';
import { RuiListbox } from './listbox';
import { RuiListbox as RuiListboxElement } from './listbox.script';

const meta = {
	title: 'Components/Listbox',
	component: RuiListbox,
	parameters: { radiant: { element: RuiListboxElement, cssImports: ['./listbox.css'] } },
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
