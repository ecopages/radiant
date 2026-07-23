import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiListbox } from './listbox';

const meta = {
	title: 'Components/Listbox',
	component: RuiListbox,
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
