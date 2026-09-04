import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiLabel } from '../label';
import { RuiRadio, RuiRadioGroup, RuiRadioGroupControl } from './radio-group';
import { RuiRadioGroup as RuiRadioGroupElement } from './radio-group.script';

const defaultOptions = [
	{ value: 'email', label: 'Email' },
	{ value: 'sms', label: 'SMS' },
	{ value: 'push', label: 'Push' },
];

const meta = {
	title: 'Components/Radio Group',
	component: RuiRadioGroup,
	parameters: { radiant: { element: RuiRadioGroupElement, cssImports: ['./radio-group.css', '../label/label.css'] } },
	args: {
		name: 'channel',
		label: 'Notification channel',
		value: '',
		disabled: false,
		options: defaultOptions,
	},
} satisfies Meta<typeof RuiRadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const getRadios = (canvasElement: HTMLElement) =>
	Array.from(canvasElement.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-radio-group') as HTMLElement;
		const radios = getRadios(canvasElement);

		await step('clicking a radio selects it and updates the host value', async () => {
			await userEvent.click(radios[1]);
			await expect(radios[1]).toBeChecked();
			await expect(host).toHaveAttribute('value', 'sms');
		});

		await step('selecting another radio deselects the previous one', async () => {
			await userEvent.click(radios[0]);
			await expect(radios[0]).toBeChecked();
			await expect(radios[1]).not.toBeChecked();
		});

		await step('a rui-change event carries the new value', async () => {
			const emissions: string[] = [];
			host.addEventListener('rui-change', (event) =>
				emissions.push((event as CustomEvent<{ value: string }>).detail.value),
			);
			await userEvent.click(radios[2]);
			await expect(emissions).toEqual(['push']);
		});
	},
};

export const FallbackName: Story = {
	args: { name: '', label: 'Notification channel' },
	play: async ({ canvasElement, step }) => {
		const radios = getRadios(canvasElement);

		await step('radios share a fallback name when the group name is empty', async () => {
			await expect(radios.length).toBeGreaterThan(1);
			await expect(radios[0].name).toBe('rui-radio-group');
			for (const radio of radios) {
				await expect(radio.name).toBe('rui-radio-group');
			}
		});
	},
};

export const WithValue: Story = {
	args: { value: 'sms' },
};

export const Disabled: Story = {
	args: { disabled: true, value: 'email' },
	play: async ({ canvasElement, step }) => {
		const radios = getRadios(canvasElement);

		await step('every radio in a disabled group is disabled', async () => {
			for (const radio of radios) {
				await expect(radio).toBeDisabled();
			}
		});
	},
};

export const Composed: Story = {
	render: () => (
		<RuiRadioGroup name="contact" label="Preferred contact method">
			<RuiRadioGroupControl>
				<RuiRadio value="email">Email</RuiRadio>
				<RuiRadio value="sms">SMS</RuiRadio>
				<RuiRadio value="push">Push</RuiRadio>
			</RuiRadioGroupControl>
		</RuiRadioGroup>
	),
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-radio-group') as HTMLElement;
		const radios = getRadios(canvasElement);

		await step('composed options update the group value', async () => {
			await userEvent.click(radios[1]);
			await expect(host).toHaveAttribute('value', 'sms');
		});
	},
};

export const AsField: Story = {
	render: () => (
		<RuiField name="plan" rules={{ required: 'Select a plan' }}>
			<RuiLabel>Plan</RuiLabel>
			<RuiRadioGroup
				options={[
					{ value: 'free', label: 'Free' },
					{ value: 'pro', label: 'Pro' },
				]}
			/>
			<RuiFieldDescription>You can change this later.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
};
