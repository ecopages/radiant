import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { RuiButton } from '../button/button';
import { RuiCheckbox } from '../checkbox';
import { RuiCombobox } from '../combobox';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiForm } from '../form';
import { RuiInput } from '../input';
import { RuiLabel } from '../label';
import { RuiListbox } from '../listbox';
import { RuiRadioGroup } from '../radio-group';
import { RuiSlider } from '../slider';
import { RuiSpinbutton } from '../spinbutton';
import { RuiSwitch } from '../switch';
import { RuiTextarea } from '../textarea';
import { findFieldControl, findFieldError } from './control-protocol';
import '../field/field.script';
import './form.script';

const meta = {
	title: 'Components/Form',
	component: RuiForm,
} satisfies Meta<typeof RuiForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const setNativeInputValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string): void => {
	const descriptor = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value');
	descriptor?.set?.call(element, value);
	element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
	element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
};

const getFieldHost = (root: HTMLElement, name: string): HTMLElement | null => {
	const named = root.querySelector(`rui-field[name="${name}"]`);
	if (named instanceof HTMLElement) {
		return named;
	}
	return (
		(Array.from(root.querySelectorAll('rui-field')).find(
			(field) => (field as HTMLElement & { name?: string }).name === name,
		) as HTMLElement | undefined) ?? null
	);
};

const getFieldErrorMessage = (root: HTMLElement, fieldName: string): string | null => {
	const field = getFieldHost(root, fieldName);
	if (!field) {
		return null;
	}
	const errorEl = findFieldError(field);
	if (!errorEl || errorEl.hidden) {
		return null;
	}
	return errorEl.textContent;
};

const expectFieldError = async (root: HTMLElement, fieldName: string, message: string) => {
	await waitFor(() => {
		expect(getFieldErrorMessage(root, fieldName)).toBe(message);
	});
};

const getTextControl = (root: HTMLElement, index = 0) => {
	const fields = Array.from(root.querySelectorAll('rui-field'));
	const field = fields[index];
	if (!(field instanceof HTMLElement)) {
		throw new Error(`Missing rui-field at index ${index}`);
	}
	const control = findFieldControl(field);
	if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) {
		throw new Error(`Missing text control in field index ${index}`);
	}
	return control;
};

const getComboboxInput = (root: HTMLElement) =>
	root.querySelector('[data-combobox-input]') as HTMLInputElement;

const getComboboxOptions = (root: HTMLElement) =>
	Array.from(root.querySelectorAll('[data-combobox-option]')) as HTMLElement[];

export const Validation: Story = {
	render: () => (
		<RuiForm defaultValues={{ email: '', bio: '' }} mode="onSubmit" reValidateMode="onChange">
			<RuiField name="email" rules={{ required: 'Email is required' }}>
				<RuiLabel>Email</RuiLabel>
				<RuiInput type="email" placeholder="you@example.com" />
				<RuiFieldDescription>We never share your email.</RuiFieldDescription>
				<RuiFieldError />
			</RuiField>

			<RuiField name="bio" rules={{ minLength: { value: 10, message: 'At least 10 characters' } }}>
				<RuiLabel>Bio</RuiLabel>
				<RuiTextarea rows={3} placeholder="Tell us about yourself" />
				<RuiFieldError />
			</RuiField>

			<RuiButton type="submit">Save</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		await step('submit shows validation errors', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await expectFieldError(canvasElement, 'email', 'Email is required');
			await expectFieldError(canvasElement, 'bio', 'At least 10 characters');
		});

		await step('valid email clears error after revalidation', async () => {
			const email = getTextControl(canvasElement, 0);
			setNativeInputValue(email, 'hello@example.com');
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await waitFor(() => {
				expect(getFieldErrorMessage(canvasElement, 'email')).toBeNull();
			});
			await expectFieldError(canvasElement, 'bio', 'At least 10 characters');
		});

		await step('bio length rule clears when satisfied', async () => {
			const bio = getTextControl(canvasElement, 1);
			setNativeInputValue(bio, '1234567890');
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await waitFor(() => {
				expect(getFieldErrorMessage(canvasElement, 'bio')).toBeNull();
			});
		});
	},
};

export const ValidationOnBlur: Story = {
	render: () => (
		<RuiForm defaultValues={{ email: '' }} mode="onBlur" reValidateMode="onChange">
			<RuiField name="email" rules={{ required: 'Email is required' }}>
				<RuiLabel>Email</RuiLabel>
				<RuiInput type="email" placeholder="you@example.com" />
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Save</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const input = getTextControl(canvasElement);

		await step('blur without input shows error (onBlur mode)', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await expectFieldError(canvasElement, 'email', 'Email is required');
		});

		await step('focusout on control also surfaces blur validation', async () => {
			const freshInput = getTextControl(canvasElement);
			freshInput.focus();
			setNativeInputValue(freshInput, '');
			freshInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }));
			await expectFieldError(canvasElement, 'email', 'Email is required');
			await expect(freshInput).toHaveAttribute('aria-invalid', 'true');
		});

		await step('submit still validates all fields', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await expectFieldError(canvasElement, 'email', 'Email is required');
		});
	},
};

export const ValidationOnChange: Story = {
	render: () => (
		<RuiForm defaultValues={{ email: '' }} mode="onChange" reValidateMode="onChange">
			<RuiField name="email" rules={{ required: 'Email is required' }}>
				<RuiLabel>Email</RuiLabel>
				<RuiInput type="email" placeholder="you@example.com" />
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Save</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const input = getTextControl(canvasElement);

		await step('typing clears required error after first change', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await expectFieldError(canvasElement, 'email', 'Email is required');
			setNativeInputValue(input, 'a');
			setNativeInputValue(input, '');
			await expectFieldError(canvasElement, 'email', 'Email is required');
		});
	},
};

export const WithCombobox: Story = {
	render: () => (
		<RuiForm defaultValues={{ country: '' }}>
			<RuiField name="country" rules={{ required: 'Choose a country' }}>
				<RuiLabel>Country</RuiLabel>
				<RuiCombobox
					placeholder="Search countries"
					options={[
						{ value: 'de', label: 'Germany' },
						{ value: 'it', label: 'Italy' },
					]}
				/>
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Continue</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);

		await step('submit without selection shows field error', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
			await expectFieldError(canvasElement, 'country', 'Choose a country');
		});
	},
};

export const WithCheckbox: Story = {
	render: () => (
		<RuiForm defaultValues={{ terms: false }}>
			<RuiField name="terms" rules={{ required: 'You must accept the terms' }}>
				<RuiCheckbox>Accept terms</RuiCheckbox>
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Continue</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);

		await step('submit without acceptance shows error', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
			await expectFieldError(canvasElement, 'terms', 'You must accept the terms');
		});
	},
};

export const WithSwitch: Story = {
	render: () => (
		<RuiForm defaultValues={{ notifications: false }}>
			<RuiField name="notifications">
				<RuiSwitch>Email notifications</RuiSwitch>
				<RuiFieldDescription>Receive product updates by email.</RuiFieldDescription>
			</RuiField>
			<RuiButton type="submit">Save</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);

		await step('switch toggles without validation errors', async () => {
			expect(canvasElement.querySelectorAll('rui-switch')).toHaveLength(1);
			expect(canvasElement.querySelectorAll('.rui-switch__track')).toHaveLength(1);

			const toggle = canvas.getByRole('switch');
			await expect(toggle).not.toBeChecked();
			await userEvent.click(toggle);
			await expect(toggle).toBeChecked();
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
		});
	},
};

export const WithRadioGroup: Story = {
	render: () => (
		<RuiForm defaultValues={{ plan: 'free' }}>
			<RuiField name="plan" rules={{ required: 'Select a plan' }}>
				<RuiLabel>Plan</RuiLabel>
				<RuiRadioGroup
					options={[
						{ value: 'free', label: 'Free' },
						{ value: 'pro', label: 'Pro' },
					]}
				/>
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Continue</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);

		await step('form with default plan value submits without error', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
			await waitFor(() => {
				expect(getFieldErrorMessage(canvasElement, 'plan')).toBeNull();
			});
		});
	},
};

export const WithSlider: Story = {
	render: () => (
		<RuiForm defaultValues={{ volume: 50 }}>
			<RuiField name="volume">
				<RuiLabel>Volume</RuiLabel>
				<RuiSlider min={0} max={100} value={50} />
			</RuiField>
			<RuiButton type="submit">Save</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const slider = canvasElement.querySelector('rui-slider') as HTMLElement;

		await step('slider field registers and submits cleanly', async () => {
			await expect(slider).toBeInTheDocument();
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
		});
	},
};

export const WithSpinbutton: Story = {
	render: () => (
		<RuiForm defaultValues={{ quantity: 1 }}>
			<RuiField name="quantity" rules={{ min: { value: 1, message: 'Minimum is 1' } }}>
				<RuiLabel>Quantity</RuiLabel>
				<RuiSpinbutton min={1} max={10} value={1} />
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Add to cart</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);

		await step('valid default quantity submits without error', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Add to cart' }));
			await waitFor(() => {
				expect(getFieldErrorMessage(canvasElement, 'quantity')).toBeNull();
			});
		});
	},
};

export const WithListbox: Story = {
	render: () => (
		<RuiForm defaultValues={{ framework: '' }}>
			<RuiField name="framework" rules={{ required: 'Pick a framework' }}>
				<RuiLabel>Framework</RuiLabel>
				<RuiListbox
					label="Framework"
					options={[
						{ value: 'radiant', label: 'Radiant' },
						{ value: 'react', label: 'React' },
					]}
				/>
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Continue</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);

		await step('submit without selection shows error', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
			await expectFieldError(canvasElement, 'framework', 'Pick a framework');
		});
	},
};
