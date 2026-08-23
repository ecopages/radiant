import { describe, expect, it, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx';
import { RuiButton } from '../button/button';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiInput } from '../input';
import { RuiTextarea } from '../textarea';
import { RuiLabel } from '../label';
import { RuiSwitch } from '../switch';
import { RuiDateField } from '../date-field';
import { RuiForm } from './form';
import '../field/field.script';
import './form.script';
import '../switch/switch.script';
import '../date-field/date-field.script';
import { findFieldControl, findFieldError } from './control-protocol';
import type { RuiField as RuiFieldElement } from '../field/field.script';
import type { RuiForm as RuiFormElement } from './form.script';
import type { FormContextValue } from './form-context';

async function flushRender(): Promise<void> {
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve());
		});
	});
}

describe('RuiField view', () => {
	it('serializes rules into the rui-field template', () => {
		const view = RuiField({
			name: 'email',
			rules: { required: 'Email is required' },
			children: null,
		});
		expect(JSON.stringify(view)).toContain('Email is required');
	});
});

	describe('rui-field composed content discovery', () => {
	it('calls RuiForm onSubmit with validated values', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		const submitted: Array<Record<string, unknown>> = [];
		root.render(
			<RuiForm
				defaultValues={{ email: 'hello@example.com' }}
				onSubmit={(values) => {
					submitted.push(values);
				}}
			>
				<RuiField name="email">
					<RuiLabel>Email</RuiLabel>
					<RuiInput type="email" />
				</RuiField>
				<RuiButton type="submit">Save</RuiButton>
			</RuiForm>,
		);

		await customElements.whenDefined('rui-form');
		await flushRender();
		await new Promise((resolve) => setTimeout(resolve, 0));

		const save = host.querySelector('button') as HTMLButtonElement;
		save.click();
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(submitted).toEqual([{ email: 'hello@example.com' }]);
		host.remove();
	});

	it('submits the native form after validation when action or method is provided', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<RuiForm defaultValues={{ email: 'hello@example.com' }} action="/accounts" method="post">
				<RuiField name="email">
					<RuiLabel>Email</RuiLabel>
					<RuiInput type="email" />
				</RuiField>
				<RuiButton type="submit">Save</RuiButton>
			</RuiForm>,
		);

		await customElements.whenDefined('rui-form');
		await flushRender();
		await new Promise((resolve) => setTimeout(resolve, 0));

		const form = host.querySelector('rui-form') as RuiFormElement;
		const nativeForm = form.getRef<HTMLFormElement>('form')!;
		const submit = vi.fn();
		nativeForm.submit = submit;

		const save = host.querySelector('button') as HTMLButtonElement;
		save.click();
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(nativeForm.action).toContain('/accounts');
		expect(nativeForm.method).toBe('post');
		expect(submit).toHaveBeenCalledOnce();
		host.remove();
	});

	it('finds control and error nodes after Radiant slot projection', async () => {
		const form = document.createElement('rui-form') as RuiFormElement;
		const field = document.createElement('rui-field') as RuiFieldElement;
		field.name = 'email';
		field.rules = { required: 'Email is required' };
		field.innerHTML = `
			<label class="rui-label" data-rui-field-label>Email</label>
			<input data-rui-control type="email" />
			<p class="rui-field__error" data-rui-field-error role="alert" hidden></p>
		`;

		form.appendChild(field);
		document.body.append(form);

		await customElements.whenDefined('rui-form');
		await customElements.whenDefined('rui-field');
		await flushRender();

		expect(findFieldControl(field)).not.toBeNull();
		expect(findFieldError(field)).not.toBeNull();

		form.remove();
	});

	it('ignores unmarked native inputs and discovers library hosts', async () => {
		const field = document.createElement('rui-field') as RuiFieldElement;
		field.name = 'plan';
		field.innerHTML = `
			<label class="rui-label" data-rui-field-label>Plan</label>
			<input type="text" value="ignored" />
			<rui-select value="pro"></rui-select>
		`;
		document.body.append(field);

		await customElements.whenDefined('rui-field');
		await flushRender();

		expect(findFieldControl(field)?.localName).toBe('rui-select');

		field.remove();
	});

	it('shows validation message after invalid submit', async () => {
		const form = document.createElement('rui-form') as RuiFormElement;
		const nativeForm = document.createElement('form');
		nativeForm.className = 'rui-form';
		nativeForm.setAttribute('data-ref', 'form');
		nativeForm.noValidate = true;
		const field = document.createElement('rui-field') as RuiFieldElement;
		field.name = 'email';
		field.rules = { required: 'Email is required' };
		field.innerHTML = `
			<label class="rui-label" data-rui-field-label>Email</label>
			<input data-rui-control type="email" />
			<p class="rui-field__error" data-rui-field-error role="alert" hidden></p>
		`;

		nativeForm.append(field);
		form.append(nativeForm);
		document.body.append(form);

		await customElements.whenDefined('rui-form');
		await customElements.whenDefined('rui-field');
		await flushRender();
		await new Promise<void>((resolve) => queueMicrotask(() => queueMicrotask(resolve)));

		expect(form.getRef<HTMLFormElement>('form')).toBe(nativeForm);

		let invalid = false;
		form.addEventListener('rui-invalid', () => {
			invalid = true;
		});

		nativeForm.requestSubmit();
		await flushRender();
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(invalid).toBe(true);

		const ctx = (form as unknown as { formProvider: { getContext(): FormContextValue } }).formProvider.getContext();
		expect(ctx.fields.email?.error).toBe('Email is required');
		expect(ctx.fields.email?.invalid).toBe(true);
		expect(ctx.errors.email?.message).toBe('Email is required');

		const control = findFieldControl(field);
		expect(control?.getAttribute('aria-invalid')).toBe('true');

		const errorEl = findFieldError(field);
		expect(errorEl?.textContent).toBe('Email is required');
		expect(errorEl?.hidden).toBe(false);

		form.remove();
	});

	it('validates email and bio like the Validation story', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<RuiForm defaultValues={{ email: '', bio: '' }} mode="onSubmit" reValidateMode="onChange">
				<RuiField name="email" rules={{ required: 'Email is required' }}>
					<RuiLabel>Email</RuiLabel>
					<RuiInput type="email" />
					<RuiFieldError />
				</RuiField>
				<RuiField name="bio" rules={{ minLength: { value: 10, message: 'At least 10 characters' } }}>
					<RuiLabel>Bio</RuiLabel>
					<RuiTextarea rows={3} />
					<RuiFieldError />
				</RuiField>
				<RuiButton type="submit">Save</RuiButton>
			</RuiForm>,
		);

		await customElements.whenDefined('rui-form');
		await flushRender();
		await new Promise((resolve) => setTimeout(resolve, 0));

		const save = host.querySelector('button') as HTMLButtonElement;
		await save.click();
		await flushRender();
		await new Promise((resolve) => setTimeout(resolve, 0));

		const emailField = host.querySelector('rui-field[name=email]') as RuiFieldElement;
		const bioField = host.querySelector('rui-field[name=bio]') as RuiFieldElement;
		expect(findFieldError(emailField)?.textContent).toBe('Email is required');
		expect(findFieldError(bioField)?.textContent).toBe('At least 10 characters');
		host.remove();
	});

	it('validates through Radiant JSX views (Storybook path)', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<RuiForm defaultValues={{ email: '' }} mode="onSubmit" reValidateMode="onChange">
				<RuiField name="email" rules={{ required: 'Email is required' }}>
					<RuiLabel>Email</RuiLabel>
					<RuiInput type="email" placeholder="you@example.com" />
					<RuiFieldError />
				</RuiField>
				<RuiButton type="submit">Save</RuiButton>
			</RuiForm>,
		);

		await customElements.whenDefined('rui-form');
		await customElements.whenDefined('rui-field');
		await flushRender();
		await new Promise<void>((resolve) => queueMicrotask(() => queueMicrotask(resolve)));

		const form = host.querySelector('rui-form') as RuiFormElement;
		const field = host.querySelector('rui-field') as RuiFieldElement;
		expect(form).not.toBeNull();
		expect(field).not.toBeNull();
		expect(field.name).toBe('email');
		expect(field.rules).toBeTruthy();

		const save = host.querySelector('button') as HTMLButtonElement;
		await save.click();
		await flushRender();
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(findFieldError(field)?.textContent).toBe('Email is required');

		host.remove();
	});

	/**
	 * Regression guard: `readFieldRules()` must use the live `rules` prop as-is — including
	 * a `validate` function — rather than anything derived from `fieldProvider`'s hydrated
	 * (JSON-safe-only) context, which is only ever populated by a real SSR round-trip.
	 */
	it('runs a custom validate function passed via the rules prop through the RuiField view', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		const validate = (value: unknown) => (value === 'taken@example.com' ? 'Email already in use' : true);
		root.render(
			<RuiForm defaultValues={{ email: '' }} mode="onSubmit">
				<RuiField name="email" rules={{ validate }}>
					<RuiLabel>Email</RuiLabel>
					<RuiInput type="email" />
					<RuiFieldError />
				</RuiField>
				<RuiButton type="submit">Save</RuiButton>
			</RuiForm>,
		);

		await customElements.whenDefined('rui-form');
		await customElements.whenDefined('rui-field');
		await flushRender();
		await new Promise<void>((resolve) => queueMicrotask(() => queueMicrotask(resolve)));

		const field = host.querySelector('rui-field') as RuiFieldElement;
		const email = findFieldControl(field) as HTMLInputElement;
		email.focus();
		email.value = 'taken@example.com';
		email.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
		await flushRender();

		const save = host.querySelector('button') as HTMLButtonElement;
		await save.click();
		await flushRender();
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(findFieldError(field)?.textContent).toBe('Email already in use');
		host.remove();
	});

	it('clears email error after valid input when reValidateMode is onChange', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<RuiForm defaultValues={{ email: '' }} mode="onSubmit" reValidateMode="onChange">
				<RuiField name="email" rules={{ required: 'Email is required' }}>
					<RuiLabel>Email</RuiLabel>
					<RuiInput type="email" />
					<RuiFieldError />
				</RuiField>
				<RuiButton type="submit">Save</RuiButton>
			</RuiForm>,
		);

		await customElements.whenDefined('rui-form');
		await customElements.whenDefined('rui-field');
		await flushRender();
		await new Promise<void>((resolve) => queueMicrotask(() => queueMicrotask(resolve)));

		const field = host.querySelector('rui-field') as RuiFieldElement;
		const save = host.querySelector('button') as HTMLButtonElement;
		await save.click();
		await flushRender();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(findFieldError(field)?.textContent).toBe('Email is required');

		const email = findFieldControl(field) as HTMLInputElement;
		email.focus();
		email.value = 'hello@example.com';
		email.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
		await flushRender();
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(findFieldError(field)?.textContent).toBe('');
		expect(findFieldError(field)?.hidden).toBe(true);

		host.remove();
	});

	it('validates an empty date field inside a form', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<RuiForm defaultValues={{ appointment: '' }} mode="onSubmit">
				<RuiField name="appointment" rules={{ required: 'Pick a date' }}>
					<RuiLabel>Appointment</RuiLabel>
					<RuiDateField placeholder="mm/dd/yyyy" />
					<RuiFieldError />
				</RuiField>
				<RuiButton type="submit">Book</RuiButton>
			</RuiForm>,
		);

		await customElements.whenDefined('rui-form');
		await customElements.whenDefined('rui-field');
		await customElements.whenDefined('rui-date-field');
		await flushRender();
		await new Promise<void>((resolve) => queueMicrotask(() => queueMicrotask(resolve)));

		const field = host.querySelector('rui-field') as RuiFieldElement;
		const save = host.querySelector('button[type="submit"]') as HTMLButtonElement;
		await save.click();
		await flushRender();
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(findFieldError(field)?.textContent).toBe('Pick a date');

		host.remove();
	});

	it('renders a single switch inside rui-field (no slot projection duplicate)', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<RuiForm defaultValues={{ notifications: false }}>
				<RuiField name="notifications">
					<RuiSwitch>Email notifications</RuiSwitch>
					<RuiFieldDescription>Receive product updates by email.</RuiFieldDescription>
				</RuiField>
			</RuiForm>,
		);

		await customElements.whenDefined('rui-form');
		await customElements.whenDefined('rui-field');
		await customElements.whenDefined('rui-switch');
		await flushRender();
		await new Promise<void>((resolve) => queueMicrotask(() => queueMicrotask(resolve)));

		const field = host.querySelector('rui-field') as RuiFieldElement;
		expect(field.querySelectorAll('rui-switch')).toHaveLength(1);
		expect(field.querySelectorAll('.rui-switch__track')).toHaveLength(1);
		expect(field.querySelectorAll('input[role="switch"]')).toHaveLength(1);

		host.remove();
	});
});
