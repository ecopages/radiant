import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { RuiButton } from '../button';
import { RuiForm } from '../form';
import { findFieldControl } from '../form/control-protocol';
import { RuiInput } from '../input';
import { RuiLabel } from '../label';
import { RuiSelect } from '../select';
import { RuiSwitch } from '../switch';
import { RuiField, RuiFieldDescription, RuiFieldError } from './index';
import { RuiField as RuiFieldElement } from './field.script';

const meta = {
	title: 'Components/Field',
	component: RuiField,
	parameters: { radiant: { element: RuiFieldElement, cssImports: ['./field.css'] } },
	args: { name: 'email' },
} satisfies Meta<typeof RuiField>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Outside a form, `rules` has nothing to validate them — there is no store to run the
 * resolver. Drive presentation manually via the `error`/`invalid` props instead; compute
 * validity however the app needs and hand the result to the field. Contrast with {@link InForm}.
 */
export const Standalone: Story = {
	render: () => (
		<RuiField name="email" error="Enter a valid email" invalid>
			<RuiLabel>Email</RuiLabel>
			<RuiInput type="email" />
			<RuiFieldDescription>Standalone field without a form provider.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const input = canvasElement.querySelector('input[data-rui-control]') as HTMLInputElement;

		await step('standalone error prop surfaces in UI and ARIA', async () => {
			await expect(canvas.getByText('Enter a valid email')).toBeVisible();
			await expect(input).toHaveAttribute('aria-invalid', 'true');
		});
	},
};

/**
 * Wrapped in a `<rui-form>`, `rules` are enforced automatically by the form's store —
 * no manual `error`/`invalid` wiring needed. This is the only place `rules` take effect;
 * contrast with {@link Standalone}.
 */
export const InForm: Story = {
	render: () => (
		<RuiForm defaultValues={{ email: '' }} mode="onSubmit">
			<RuiField name="email" rules={{ required: 'Email is required' }}>
				<RuiLabel>Email</RuiLabel>
				<RuiInput type="email" />
				<RuiFieldDescription>Validated automatically by the ancestor form.</RuiFieldDescription>
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Save</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const input = canvasElement.querySelector('input[data-rui-control]') as HTMLInputElement;

		await step('submitting empty triggers the field rules automatically', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await waitFor(async () => {
				await expect(canvas.getByText('Email is required')).toBeVisible();
			});
			await expect(input).toHaveAttribute('aria-invalid', 'true');
		});
	},
};

/**
 * `rules.required` drives `aria-required` immediately — that part is declarative and needs
 * no form. Actually enforcing it (flipping `aria-invalid` and showing the message) still
 * needs the ancestor form's store to run validation on submit.
 */
export const Required: Story = {
	render: () => (
		<RuiForm defaultValues={{ email: '' }} mode="onSubmit">
			<RuiField name="email" rules={{ required: 'Email is required' }}>
				<RuiLabel>Email</RuiLabel>
				<RuiInput type="email" />
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Save</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const input = canvasElement.querySelector('input[data-rui-control]') as HTMLInputElement;

		await step(
			'aria-required reflects the rule before any interaction (nested field rules may settle after form connect)',
			async () => {
				await waitFor(async () => {
					await expect(input).toHaveAttribute('aria-required', 'true');
				});
				await expect(input).toHaveAttribute('aria-invalid', 'false');
			},
		);

		await step('submitting empty enforces it', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await waitFor(async () => {
				await expect(input).toHaveAttribute('aria-invalid', 'true');
			});
			await expect(canvas.getByText('Email is required')).toBeVisible();
		});
	},
};

/** The `disabled` prop cascades to the control itself, not just the field's own ARIA state. */
export const Disabled: Story = {
	render: () => (
		<RuiField name="email" disabled>
			<RuiLabel>Email</RuiLabel>
			<RuiInput type="email" />
			<RuiFieldDescription>Disabled fields cascade to their control.</RuiFieldDescription>
		</RuiField>
	),
	play: async ({ canvasElement, step }) => {
		const input = canvasElement.querySelector('input[data-rui-control]') as HTMLInputElement;

		await step('disabled cascades to the native control', async () => {
			await expect(input).toBeDisabled();
			await expect(input).toHaveAttribute('aria-disabled', 'true');
		});
	},
};

/** `RuiFieldDescription` is linked to the control via `aria-describedby`, not just proximity. */
export const WithDescription: Story = {
	render: () => (
		<RuiField name="email">
			<RuiLabel>Email</RuiLabel>
			<RuiInput type="email" />
			<RuiFieldDescription>We'll only use this to send your receipt.</RuiFieldDescription>
		</RuiField>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const input = canvasElement.querySelector('input[data-rui-control]') as HTMLInputElement;
		const description = canvas.getByText("We'll only use this to send your receipt.");

		await step('description is linked via aria-describedby', async () => {
			await expect(description).toHaveAttribute('id');
			const describedBy = (input.getAttribute('aria-describedby') ?? '').split(' ');
			await expect(describedBy).toContain(description.id);
		});
	},
};

/**
 * Field discovers Radiant hosts (`rui-select`, `rui-switch`, …) and presentational controls
 * marked with `data-rui-control`. Prefer those over unmarked native inputs.
 */
export const LibraryControls: Story = {
	render: () => (
		<div style={{ display: 'grid', gap: '1rem', maxWidth: '20rem' }}>
			<RuiField name="plan">
				<RuiLabel>Plan</RuiLabel>
				<RuiSelect
					value="pro"
					options={[
						{ value: 'free', label: 'Free' },
						{ value: 'pro', label: 'Pro' },
					]}
				/>
			</RuiField>
			<RuiField name="notifications">
				<RuiSwitch>Email notifications</RuiSwitch>
			</RuiField>
		</div>
	),
	play: async ({ canvasElement, step }) => {
		await step('select and switch are wired through the library control protocol', async () => {
			const fields = Array.from(canvasElement.querySelectorAll('rui-field')) as HTMLElement[];
			await expect(fields).toHaveLength(2);
			await expect(findFieldControl(fields[0])).not.toBeNull();
			await expect(fields[0].querySelector('rui-select')).not.toBeNull();
			await expect(findFieldControl(fields[1])).not.toBeNull();
			await expect(fields[1].querySelector('rui-switch')).not.toBeNull();
		});
	},
};

/** With `reValidateMode="onChange"`, a fixed value clears the error without another submit. */
export const ClearsAfterFix: Story = {
	render: () => (
		<RuiForm defaultValues={{ email: '' }} mode="onSubmit" reValidateMode="onChange">
			<RuiField name="email" rules={{ required: 'Email is required' }}>
				<RuiLabel>Email</RuiLabel>
				<RuiInput type="email" />
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Save</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);
		const input = canvasElement.querySelector('input[data-rui-control]') as HTMLInputElement;

		await step('empty submit shows the error', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
			await waitFor(async () => {
				await expect(canvas.getByText('Email is required')).toBeVisible();
			});
		});

		await step('typing a value revalidates on change and clears it', async () => {
			await userEvent.type(input, 'hello@example.com');
			await waitFor(async () => {
				await expect(input).toHaveAttribute('aria-invalid', 'false');
			});
		});
	},
};
