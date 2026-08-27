import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiCheckbox } from '../checkbox';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiLabel } from '../label';
import { RuiCheckboxGroup, RuiCheckboxGroupControl } from './checkbox-group';
import { RuiCheckboxGroup as RuiCheckboxGroupElement } from './checkbox-group.script';

const defaultOptions = [
	{ value: 'product', label: 'Product updates' },
	{ value: 'security', label: 'Security alerts' },
	{ value: 'marketing', label: 'Marketing emails' },
];

const meta = {
	title: 'Components/Checkbox Group',
	component: RuiCheckboxGroup,
	parameters: {
		radiant: { element: RuiCheckboxGroupElement, cssImports: ['./checkbox-group.css', '../checkbox/checkbox.css'] },
	},
	args: {
		name: 'notifications',
		label: 'Email notifications',
		value: '',
		disabled: false,
		orientation: 'vertical',
		options: defaultOptions,
	},
} satisfies Meta<typeof RuiCheckboxGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const getCheckboxes = (canvasElement: HTMLElement) =>
	Array.from(canvasElement.querySelectorAll('rui-checkbox input[type="checkbox"]')) as HTMLInputElement[];

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-checkbox-group') as HTMLElement;
		const checkboxes = getCheckboxes(canvasElement);

		await step('clicking a checkbox selects it and updates the host value', async () => {
			await userEvent.click(checkboxes[0]);
			await expect(checkboxes[0]).toBeChecked();
			await expect(host).toHaveAttribute('value', 'product');
		});

		await step('selecting another checkbox keeps both checked', async () => {
			await userEvent.click(checkboxes[1]);
			await expect(checkboxes[0]).toBeChecked();
			await expect(checkboxes[1]).toBeChecked();
			await expect(host).toHaveAttribute('value', 'product,security');
		});

		await step('unchecking removes the value from the serialized selection', async () => {
			await userEvent.click(checkboxes[0]);
			await expect(checkboxes[0]).not.toBeChecked();
			await expect(host).toHaveAttribute('value', 'security');
		});

		await step('a rui-change event carries the serialized value', async () => {
			const emissions: string[] = [];
			host.addEventListener('rui-change', (event) =>
				emissions.push((event as CustomEvent<{ value: string }>).detail.value),
			);
			await userEvent.click(checkboxes[2]);
			await expect(emissions).toEqual(['security,marketing']);
		});
	},
};

export const WithValue: Story = {
	args: { value: 'product,security' },
};

export const Horizontal: Story = {
	args: { orientation: 'horizontal', value: 'product' },
};

export const Disabled: Story = {
	args: { disabled: true, value: 'product' },
	play: async ({ canvasElement, step }) => {
		const checkboxes = getCheckboxes(canvasElement);

		await step('every checkbox in a disabled group is disabled', async () => {
			for (const checkbox of checkboxes) {
				await expect(checkbox).toBeDisabled();
			}
		});
	},
};

export const Composed: Story = {
	render: () => (
		<RuiCheckboxGroup name="condiments" label="Sandwich condiments">
			<RuiCheckboxGroupControl>
				<RuiCheckbox value="lettuce">Lettuce</RuiCheckbox>
				<RuiCheckbox value="tomato" disabled>
					Tomato
				</RuiCheckbox>
				<RuiCheckbox value="onion">Onion</RuiCheckbox>
			</RuiCheckboxGroupControl>
		</RuiCheckboxGroup>
	),
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-checkbox-group') as HTMLElement;
		const checkboxes = getCheckboxes(canvasElement);

		await step('composed item disabled survives group connect', async () => {
			await expect(checkboxes[1]).toBeDisabled();
			await expect(checkboxes[1].closest('rui-checkbox')).toHaveAttribute('data-disabled');
		});

		await step('composed options update the group value', async () => {
			await userEvent.click(checkboxes[0]);
			await userEvent.click(checkboxes[2]);
			await expect(host).toHaveAttribute('value', 'lettuce,onion');
		});
	},
};

export const AsField: Story = {
	render: () => (
		<RuiField name="topics" rules={{ required: 'Select at least one topic' }}>
			<RuiLabel>Topics</RuiLabel>
			<RuiCheckboxGroup
				options={[
					{ value: 'news', label: 'News' },
					{ value: 'travel', label: 'Travel' },
				]}
			/>
			<RuiFieldDescription>Choose what you want to hear about.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
};
