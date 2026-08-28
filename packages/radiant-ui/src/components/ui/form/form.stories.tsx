import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { consumeContext, onContextUpdate } from '@ecopages/radiant/context';
import type { ContextProvider } from '@ecopages/radiant/context';
import { customElement } from '@ecopages/radiant';
import { RuiAutocomplete, RuiAutocompleteCollection, RuiAutocompleteEmpty } from '../autocomplete';
import { RuiAlertDescription, RuiAlertTitle } from '../alert';
import { RuiAlert as RuiAlertElement, type RuiAlertProps } from '../alert/alert.script';
import { RuiButton } from '../button/button';
import { RuiCheckbox } from '../checkbox';
import { RuiCheckboxGroup } from '../checkbox-group';
import { RuiCombobox } from '../combobox';
import { RuiDateField } from '../date-field';
import { RuiDateRangePicker } from '../date-range-picker';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiForm } from '../form';
import { RuiInput } from '../input';
import { RuiLabel } from '../label';
import { RuiListbox } from '../listbox';
import { RuiRadioGroup } from '../radio-group';
import { RuiSlider } from '../slider';
import { RuiNumberField } from '../number-field';
import {
	RuiSelect,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectSearch,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
} from '../select';
import { RuiSwitch } from '../switch';
import { RuiTagGroup, RuiTagList } from '../tag-group';
import { RuiTextarea } from '../textarea';
import { findFieldControl, findFieldError, isNativeTextControl } from './control-protocol';
import { RuiForm as RuiFormElement } from './form.script';
import { formContext, type FormContextValue } from './form-context';
import '../field/field.script';
import './form.script';

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'rui-form-validation-alert': JsxCustomElementAttributes<RuiFormValidationAlert, RuiAlertProps>;
	}
}

/** Story-only alert that demonstrates consuming a parent form's aggregate validation errors. */
@customElement('rui-form-validation-alert')
class RuiFormValidationAlert extends RuiAlertElement {
	@consumeContext(formContext)
	private formContextProvider?: ContextProvider<typeof formContext>;

	override connectedCallback(): void {
		super.connectedCallback();
		this.syncVisibility(this.formContextProvider?.getContext());
	}

	@onContextUpdate({ context: formContext, requestUpdate: false })
	onFormContextChanged(context: FormContextValue): void {
		this.syncVisibility(context);
	}

	private syncVisibility(context: FormContextValue | undefined): void {
		this.hidden = Object.keys(context?.errors ?? {}).length === 0;
	}
}

const meta = {
	title: 'Components/Form',
	component: RuiForm,
	parameters: { radiant: { element: RuiFormElement, cssImports: ['../../../styles/styles.css'] } },
} satisfies Meta<typeof RuiForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const ANIMAL_OPTIONS = [
	{ value: 'aardvark', label: 'Aardvark' },
	{ value: 'cat', label: 'Cat' },
	{ value: 'dog', label: 'Dog' },
];

const STATE_OPTIONS = [
	{ value: 'ca', label: 'California' },
	{ value: 'ny', label: 'New York' },
	{ value: 'tx', label: 'Texas' },
	{ value: 'wa', label: 'Washington' },
];

const CATEGORY_TAGS = [
	{ value: 'news', label: 'News' },
	{ value: 'travel', label: 'Travel' },
	{ value: 'gaming', label: 'Gaming' },
];

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
	if (!control || !isNativeTextControl(control)) {
		throw new Error(`Missing text control in field index ${index}`);
	}
	return control;
};

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

export const FormErrorSummary: Story = {
	render: () => (
		<RuiForm defaultValues={{ email: '', bio: '' }} mode="onSubmit" reValidateMode="onChange">
			<rui-form-validation-alert
				class="rui-alert rui-alert--error rui-alert--banner"
				variant="error"
				layout="banner"
				role="alert"
				hidden
			>
				<RuiAlertTitle>There are issues with this form</RuiAlertTitle>
				<RuiAlertDescription>
					The form cannot be submitted. Review the highlighted fields before trying again.
				</RuiAlertDescription>
			</rui-form-validation-alert>

			<RuiField name="email" rules={{ required: 'Email is required' }}>
				<RuiLabel>Email</RuiLabel>
				<RuiInput type="email" placeholder="you@example.com" />
				<RuiFieldError />
			</RuiField>

			<RuiField name="bio" rules={{ minLength: { value: 10, message: 'Enter at least 10 characters' } }}>
				<RuiLabel>Bio</RuiLabel>
				<RuiTextarea rows={3} placeholder="Tell us about yourself" />
				<RuiFieldError />
			</RuiField>

			<RuiButton type="submit">Save</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		await step('invalid submission reveals the form error summary', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await expect(canvas.findByText('There are issues with this form')).resolves.toBeVisible();
		});

		await step('resolving every error hides the summary', async () => {
			setNativeInputValue(getTextControl(canvasElement, 0), 'hello@example.com');
			setNativeInputValue(getTextControl(canvasElement, 1), 'A complete biography');
			await waitFor(() => {
				expect(canvas.getByText('There are issues with this form')).not.toBeVisible();
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

		await step('field label targets the combobox input', async () => {
			const input = canvasElement.querySelector('[data-combobox-input]') as HTMLInputElement;
			await expect(canvas.getByText('Country')).toHaveAttribute('for', input.id);
		});

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

export const WithCheckboxGroup: Story = {
	render: () => (
		<RuiForm defaultValues={{ topics: '' }}>
			<RuiField name="topics" rules={{ required: 'Select at least one topic' }}>
				<RuiLabel>Topics</RuiLabel>
				<RuiCheckboxGroup
					options={[
						{ value: 'news', label: 'News' },
						{ value: 'travel', label: 'Travel' },
					]}
				/>
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Continue</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const checkboxes = Array.from(
			canvasElement.querySelectorAll('rui-checkbox input[type="checkbox"]'),
		) as HTMLInputElement[];

		await step('submit without selection shows error', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
			await expectFieldError(canvasElement, 'topics', 'Select at least one topic');
		});

		await step('selecting a value clears the error', async () => {
			await userEvent.click(checkboxes[0]);
			await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
			await waitFor(() => {
				expect(getFieldErrorMessage(canvasElement, 'topics')).toBeNull();
			});
			await expect(canvasElement.querySelector('rui-checkbox-group')).toHaveAttribute('value', 'news');
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

export const WithNumberField: Story = {
	render: () => (
		<RuiForm defaultValues={{ quantity: 1 }}>
			<RuiField name="quantity" rules={{ min: { value: 1, message: 'Minimum is 1' } }}>
				<RuiLabel>Quantity</RuiLabel>
				<RuiNumberField minValue={1} maxValue={10} value={1} />
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

		await step('field label targets the listbox surface', async () => {
			const list = canvasElement.querySelector('[role="listbox"]') as HTMLElement;
			await waitFor(async () => {
				await expect(canvas.getByText('Framework')).toHaveAttribute('for', list.id);
				await expect(list).toHaveAttribute('aria-labelledby');
			});
		});

		await step('submit without selection shows error', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
			await expectFieldError(canvasElement, 'framework', 'Pick a framework');
		});
	},
};

export const WithSelect: Story = {
	render: () => (
		<RuiForm defaultValues={{ animal: '' }}>
			<RuiField name="animal" rules={{ required: 'Choose an animal' }}>
				<RuiLabel>Animal</RuiLabel>
				<RuiSelect placeholder="Select an animal" options={ANIMAL_OPTIONS} />
				<RuiFieldDescription>Used for your profile.</RuiFieldDescription>
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Continue</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);

		await step('field label targets the select trigger', async () => {
			const trigger = canvasElement.querySelector('[data-select-trigger]') as HTMLButtonElement;
			await expect(canvas.getByText('Animal')).toHaveAttribute('for', trigger.id);
		});

		await step('submit without selection shows error', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
			await expectFieldError(canvasElement, 'animal', 'Choose an animal');
		});

		await step('selecting a value clears the error', async () => {
			const trigger = canvasElement.querySelector('[data-select-trigger]') as HTMLButtonElement;
			await userEvent.click(trigger);
			const options = Array.from(canvasElement.querySelectorAll('[role="option"]')) as HTMLElement[];
			await userEvent.click(options[1]);
			await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
			await waitFor(() => {
				expect(getFieldErrorMessage(canvasElement, 'animal')).toBeNull();
			});
			await expect(canvasElement.querySelector('rui-select')).toHaveAttribute('value', 'cat');
		});
	},
};

export const WithSelectTagGroup: Story = {
	render: () => (
		<RuiForm defaultValues={{ states: '' }}>
			<RuiField name="states" rules={{ required: 'Select at least one state' }}>
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
								<RuiListbox embedded options={STATE_OPTIONS} />
								<RuiAutocompleteEmpty>No results.</RuiAutocompleteEmpty>
							</RuiAutocompleteCollection>
						</RuiAutocomplete>
					</RuiSelectListbox>
				</RuiSelect>
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Continue</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const select = canvasElement.querySelector('rui-select') as HTMLElement;

		await step('field label targets the multi-select trigger', async () => {
			const trigger = canvasElement.querySelector('[data-select-trigger]') as HTMLButtonElement;
			await expect(canvas.getByText('States')).toHaveAttribute('for', trigger.id);
		});

		await step('submit without selection shows error', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
			await expectFieldError(canvasElement, 'states', 'Select at least one state');
		});

		await step('selecting options adds tags and clears the error', async () => {
			const trigger = canvasElement.querySelector('[data-select-trigger]') as HTMLButtonElement;
			await userEvent.click(trigger);
			const options = Array.from(canvasElement.querySelectorAll('[role="option"]')) as HTMLElement[];
			await userEvent.click(options[0]);
			await userEvent.click(options[2]);
			await expect(select).toHaveAttribute('value', 'ca,tx');
			await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
			await waitFor(() => {
				expect(getFieldErrorMessage(canvasElement, 'states')).toBeNull();
			});
		});
	},
};

export const WithTagGroup: Story = {
	render: () => (
		<RuiForm defaultValues={{ categories: '' }}>
			<RuiField name="categories" rules={{ required: 'Select at least one category' }}>
				<RuiLabel>Categories</RuiLabel>
				<RuiTagGroup label="Categories" selectionMode="multiple" tags={CATEGORY_TAGS} />
				<RuiFieldDescription>Click tags to toggle your interests.</RuiFieldDescription>
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Save</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const tagGroup = canvasElement.querySelector('rui-tag-group') as HTMLElement;
		const tags = Array.from(canvasElement.querySelectorAll('[data-tag]')) as HTMLElement[];

		await step('submit without selection shows error', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await expectFieldError(canvasElement, 'categories', 'Select at least one category');
		});

		await step('selecting a tag clears the error', async () => {
			await userEvent.click(tags[0]);
			await expect(tagGroup).toHaveAttribute('value', 'news');
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await waitFor(() => {
				expect(getFieldErrorMessage(canvasElement, 'categories')).toBeNull();
			});
		});
	},
};

export const WithDateField: Story = {
	render: () => (
		<RuiForm defaultValues={{ appointment: '' }} mode="onSubmit">
			<RuiField name="appointment" rules={{ required: 'Pick a date' }}>
				<RuiLabel>Appointment</RuiLabel>
				<RuiDateField placeholder="mm/dd/yyyy" />
				<RuiFieldDescription>Masked while typing; formatted with Intl on blur.</RuiFieldDescription>
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Book</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const field = getFieldHost(canvasElement, 'appointment');
		const input = field ? (findFieldControl(field) as HTMLInputElement) : null;

		await step('submit without a date shows error', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Book' }));
			await expectFieldError(canvasElement, 'appointment', 'Pick a date');
		});

		await step('invalid state is reflected on the input', async () => {
			if (!input) {
				return;
			}
			await expect(input).toHaveAttribute('aria-invalid', 'true');
		});
	},
};

export const WithDateRangePicker: Story = {
	render: () => (
		<RuiForm defaultValues={{ trip: '' }} mode="onSubmit">
			<RuiField name="trip" rules={{ required: 'Pick trip dates' }}>
				<RuiLabel>Trip dates</RuiLabel>
				<RuiDateRangePicker placeholderStart="Start" placeholderEnd="End" />
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Book</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);

		await step('submit without dates shows error', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Book' }));
			await expectFieldError(canvasElement, 'trip', 'Pick trip dates');
		});
	},
};
