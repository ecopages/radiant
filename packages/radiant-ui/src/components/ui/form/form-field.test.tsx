import { describe, expect, it, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx';
import { RuiButton } from '../button/button';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiInput } from '../input';
import { RuiTextarea } from '../textarea';
import { RuiLabel } from '../label';
import { RuiSwitch } from '../switch';
import { RuiDateField } from '../date-field';
import { RuiDateInput } from '../date-input';
import { RuiNumberField } from '../number-field';
import { RuiSlider } from '../slider';
import { RuiKnob } from '../knob';
import {
	RuiCombobox,
	RuiComboboxClear,
	RuiComboboxControl,
	RuiComboboxInput,
	RuiComboboxListbox,
	RuiComboboxTrigger,
} from '../combobox';
import { RuiListbox, RuiListboxOption } from '../listbox';
import {
	RuiSelect,
	RuiSelectClear,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
} from '../select';
import { RuiForm } from './form';
import '../field/field.script';
import './form.script';
import '../switch/switch.script';
import '../date-field/date-field.script';
import '../date-input/date-input.script';
import '../number-field/number-field.script';
import '../slider/slider.script';
import '../knob/knob.script';
import { findFieldControl, findFieldError, registerFieldControl } from './control-protocol';
import type { RuiField as RuiFieldElement } from '../field/field.script';
import type { RuiForm as RuiFormElement } from './form.script';
import type { FormContextValue } from './form-context';

const LANGUAGE_OPTIONS = [
	{ value: 'js', label: 'JavaScript' },
	{ value: 'ts', label: 'TypeScript' },
];

function LanguageSelect({ value }: { value?: string }) {
	return (
		<RuiSelect placeholder="Select a language" value={value}>
			<RuiSelectControl>
				<RuiSelectTrigger>
					<RuiSelectValue />
				</RuiSelectTrigger>
				<RuiSelectClear />
				<RuiSelectToggle />
			</RuiSelectControl>
			<RuiSelectListbox>
				<RuiListbox embedded>
					{LANGUAGE_OPTIONS.map((option) => (
						<RuiListboxOption value={option.value}>{option.label}</RuiListboxOption>
					))}
				</RuiListbox>
			</RuiSelectListbox>
		</RuiSelect>
	);
}

function LanguageCombobox({ value }: { value?: string }) {
	return (
		<RuiCombobox placeholder="Select a language" value={value}>
			<RuiComboboxControl>
				<RuiComboboxInput />
				<RuiComboboxClear />
				<RuiComboboxTrigger />
			</RuiComboboxControl>
			<RuiComboboxListbox>
				<RuiListbox embedded>
					{LANGUAGE_OPTIONS.map((option) => (
						<RuiListboxOption value={option.value}>{option.label}</RuiListboxOption>
					))}
				</RuiListbox>
			</RuiComboboxListbox>
		</RuiCombobox>
	);
}

async function flushRender(): Promise<void> {
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve());
		});
	});
}

async function flushFirstConnect(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
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

	it('publishes a custom host onto native FormData', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<form>
				<RuiField name="when">
					<RuiDateInput value="2026-08-20" />
				</RuiField>
			</form>,
		);

		await customElements.whenDefined('rui-field');
		await customElements.whenDefined('rui-date-input');
		await flushRender();
		await flushFirstConnect();

		const nativeForm = host.querySelector('form') as HTMLFormElement;
		expect(new FormData(nativeForm).get('when')).toBe('2026-08-20');
		host.remove();
	});

	it('submits a named date-input without RuiField', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<form>
				<RuiDateInput name="when" value="2026-08-20" />
			</form>,
		);

		await customElements.whenDefined('rui-date-input');
		await flushRender();
		await flushFirstConnect();

		const nativeForm = host.querySelector('form') as HTMLFormElement;
		expect(new FormData(nativeForm).get('when')).toBe('2026-08-20');
		host.remove();
	});

	it('submits an empty named date as an empty value', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		createRoot(host).render(
			<form>
				<RuiDateInput name="when" value="" />
			</form>,
		);
		await customElements.whenDefined('rui-date-input');
		await flushRender();
		await flushFirstConnect();

		expect(new FormData(host.querySelector('form')!).getAll('when')).toEqual(['']);
		host.remove();
	});

	it('keeps fieldset disability separate from the authored disabled attribute', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		createRoot(host).render(
			<form>
				<fieldset>
					<RuiDateInput name="when" value="2026-08-20" />
					<RuiNumberField name="quantity" value={3} />
					<RuiSlider name="level" value={25} />
					<RuiKnob name="gain" value={25} />
				</fieldset>
			</form>,
		);
		await customElements.whenDefined('rui-date-input');
		await customElements.whenDefined('rui-number-field');
		await customElements.whenDefined('rui-slider');
		await customElements.whenDefined('rui-knob');
		await flushRender();
		await flushFirstConnect();

		const fieldset = host.querySelector('fieldset')!;
		const date = host.querySelector('rui-date-input')!;
		const quantity = host.querySelector('rui-number-field')!;
		const slider = host.querySelector('rui-slider')!;
		const knob = host.querySelector('rui-knob')!;
		fieldset.disabled = true;
		await flushRender();
		expect(date.hasAttribute('disabled')).toBe(false);
		expect(quantity.hasAttribute('disabled')).toBe(false);
		expect(slider.hasAttribute('disabled')).toBe(false);
		expect(knob.hasAttribute('disabled')).toBe(false);
		expect((quantity.querySelector('[data-number-field-input]') as HTMLInputElement).disabled).toBe(true);
		expect((slider.querySelector('[data-thumb="value"]') as HTMLButtonElement).disabled).toBe(true);
		expect((knob.querySelector('[data-ref="control"]') as HTMLButtonElement).disabled).toBe(true);
		fieldset.disabled = false;
		await flushRender();
		expect((quantity.querySelector('[data-number-field-input]') as HTMLInputElement).disabled).toBe(false);
		expect((slider.querySelector('[data-thumb="value"]') as HTMLButtonElement).disabled).toBe(false);
		expect((knob.querySelector('[data-ref="control"]') as HTMLButtonElement).disabled).toBe(false);
		expect(new FormData(host.querySelector('form')!).get('when')).toBe('2026-08-20');
		expect(new FormData(host.querySelector('form')!).get('level')).toBe('25');
		expect(new FormData(host.querySelector('form')!).get('gain')).toBe('25');
		host.remove();
	});

	it('clears a field name from native submission', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		createRoot(host).render(
			<form>
				<RuiField name="when">
					<RuiDateInput value="2026-08-20" />
				</RuiField>
			</form>,
		);
		await customElements.whenDefined('rui-field');
		await customElements.whenDefined('rui-date-input');
		await flushRender();
		await flushFirstConnect();

		const field = host.querySelector('rui-field') as RuiFieldElement;
		const nativeForm = host.querySelector('form')!;
		expect(new FormData(nativeForm).get('when')).toBe('2026-08-20');
		field.name = '';
		await flushRender();
		expect(new FormData(nativeForm).get('when')).toBeNull();
		host.remove();
	});

	it('submits a registered third-party FACE once through its host', async () => {
		class ReviewFace extends HTMLElement {
			static get formAssociated(): boolean {
				return true;
			}
			private readonly internals = this.attachInternals();
			connectedCallback(): void {
				this.internals.setFormValue(this.getAttribute('value') ?? '');
			}
		}
		if (!customElements.get('x-review-face')) customElements.define('x-review-face', ReviewFace);
		registerFieldControl('x-review-face', {
			submission: 'host',
			read: (host) => host.getAttribute('value') ?? '',
			write: (host, value) => host.setAttribute('value', String(value)),
		});

		const form = document.createElement('form');
		const field = document.createElement('rui-field');
		field.setAttribute('name', 'tone');
		const control = document.createElement('x-review-face');
		control.setAttribute('value', 'blue');
		control.setAttribute('data-rui-aria-target', 'input');
		const input = document.createElement('input');
		input.setAttribute('name', 'stale');
		control.append(input);
		field.append(control);
		form.append(field);
		document.body.append(form);
		await flushFirstConnect();

		expect(new FormData(form).getAll('tone')).toEqual(['blue']);
		expect(input.hasAttribute('name')).toBe(false);
		form.remove();
	});

	it('resets a date field parent with its form-associated child', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		createRoot(host).render(
			<form>
				<RuiDateField name="when" value="2026-08-20" />
			</form>,
		);
		await customElements.whenDefined('rui-date-field');
		await customElements.whenDefined('rui-date-input');
		await flushRender();
		await flushFirstConnect();

		const nativeForm = host.querySelector('form')!;
		const date = host.querySelector('rui-date-field') as HTMLElement & { value: string };
		date.value = '2026-09-01';
		await flushRender();
		nativeForm.reset();
		await flushRender();
		expect(date.value).toBe('2026-08-20');
		expect(new FormData(nativeForm).get('when')).toBe('2026-08-20');
		host.remove();
	});

	it('restores the authored value on form reset', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<form>
				<RuiDateInput name="when" value="2026-08-20" />
				<RuiNumberField name="quantity" value={3} />
			</form>,
		);

		await customElements.whenDefined('rui-date-input');
		await customElements.whenDefined('rui-number-field');
		await flushRender();
		await flushFirstConnect();

		const nativeForm = host.querySelector('form') as HTMLFormElement;
		const date = host.querySelector('rui-date-input') as HTMLElement & { value: string };
		const quantity = host.querySelector('rui-number-field') as HTMLElement & { value: number };
		date.value = '1999-01-01';
		quantity.value = 9;
		nativeForm.reset();

		expect(date.value).toBe('2026-08-20');
		expect(quantity.value).toBe(3);
		host.remove();
	});

	it('submits a number-field once through the host', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<form>
				<RuiField name="quantity">
					<RuiNumberField value={3} />
				</RuiField>
			</form>,
		);

		await customElements.whenDefined('rui-field');
		await customElements.whenDefined('rui-number-field');
		await flushRender();
		await flushFirstConnect();

		const nativeForm = host.querySelector('form') as HTMLFormElement;
		expect(new FormData(nativeForm).getAll('quantity')).toEqual(['3']);
		expect(host.querySelector('[data-number-field-input]')?.getAttribute('name')).toBeNull();
		host.remove();
	});

	it('does not double-submit a native text control', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<form>
				<RuiField name="email">
					<RuiInput type="email" value="hello@example.com" />
				</RuiField>
			</form>,
		);

		await customElements.whenDefined('rui-field');
		await flushRender();
		await flushFirstConnect();

		const nativeForm = host.querySelector('form') as HTMLFormElement;
		expect(new FormData(nativeForm).getAll('email')).toEqual(['hello@example.com']);
		host.remove();
	});

	it('lists a switch through the host name', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<form>
				<RuiField name="notifications">
					<RuiSwitch />
				</RuiField>
			</form>,
		);

		await customElements.whenDefined('rui-field');
		await customElements.whenDefined('rui-switch');
		await flushRender();
		await flushFirstConnect();

		expect(host.querySelector('input')?.getAttribute('name')).toBe('notifications');
		host.remove();
	});

	it('does not list a combobox filter input on native FormData', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<form>
				<RuiField name="language">
					<LanguageCombobox />
				</RuiField>
			</form>,
		);

		await customElements.whenDefined('rui-field');
		await customElements.whenDefined('rui-combobox');
		await flushRender();
		await flushFirstConnect();

		const nativeForm = host.querySelector('form') as HTMLFormElement;
		expect(new FormData(nativeForm).get('language')).toBeNull();
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

	it('prefers a composed select host over its embedded listbox', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<RuiField name="language">
				<LanguageSelect />
			</RuiField>,
		);

		await flushRender();

		const field = host.querySelector('rui-field') as RuiFieldElement;
		expect(findFieldControl(field)?.localName).toBe('rui-select');
		root.unmount();
		host.remove();
	});

	it.each([
		['select', LanguageSelect, 'rui-select', '[data-select-clear]', '[data-select-value]'],
		['combobox', LanguageCombobox, 'rui-combobox', '[data-combobox-clear]', '[data-combobox-input]'],
	] as const)(
		'applies a form default to a composed %s',
		async (_name, Control, hostTag, clearSelector, valueSelector) => {
			const host = document.createElement('div');
			document.body.append(host);
			const root = createRoot(host);
			root.render(
				<RuiForm defaultValues={{ language: ['ts'] }}>
					<RuiField name="language" defaultValue={['ts']}>
						<Control />
					</RuiField>
				</RuiForm>,
			);

			await flushRender();
			await flushFirstConnect();

			const control = host.querySelector(hostTag) as HTMLElement & { value: string[] };
			const clear = host.querySelector(clearSelector) as HTMLButtonElement;
			expect(control.value).toEqual(['ts']);
			expect(clear.hidden).toBe(false);
			const valueTarget = host.querySelector(valueSelector);
			if (valueTarget instanceof HTMLInputElement) {
				expect(valueTarget.value).toBe('TypeScript');
			} else {
				expect(valueTarget?.textContent).toContain('TypeScript');
			}
			root.unmount();
			host.remove();
		},
	);

	it('retries a field default when its composed select appears after registration', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<RuiForm defaultValues={{ language: ['ts'] }}>
				<RuiField name="language" />
			</RuiForm>,
		);

		await flushRender();

		root.render(
			<RuiForm defaultValues={{ language: ['ts'] }}>
				<RuiField name="language">
					<LanguageSelect />
				</RuiField>
			</RuiForm>,
		);

		await flushRender();
		await flushFirstConnect();

		const select = host.querySelector('rui-select') as HTMLElement & { value: string[] };
		expect(select.value).toEqual(['ts']);
		expect((host.querySelector('[data-select-clear]') as HTMLButtonElement).hidden).toBe(false);
		root.unmount();
		host.remove();
	});

	it.each([
		['select', LanguageSelect, 'rui-select', '[data-select-clear]', '[data-select-value]'],
		['combobox', LanguageCombobox, 'rui-combobox', '[data-combobox-clear]', '[data-combobox-input]'],
	] as const)(
		'keeps a composed %s empty without a field default',
		async (_name, Control, hostTag, clearSelector, valueSelector) => {
			const host = document.createElement('div');
			document.body.append(host);
			const root = createRoot(host);
			root.render(
				<RuiField name="language">
					<Control />
				</RuiField>,
			);

			await flushRender();
			await flushFirstConnect();

			const control = host.querySelector(hostTag) as HTMLElement & { value: string[] };
			const clear = host.querySelector(clearSelector) as HTMLButtonElement;
			expect(control.value).toEqual([]);
			expect(clear.hidden).toBe(true);
			const valueTarget = host.querySelector(valueSelector);
			if (valueTarget instanceof HTMLInputElement) {
				expect(valueTarget.value).toBe('');
			} else {
				expect(valueTarget?.textContent).toContain('Select a language');
			}
			root.unmount();
			host.remove();
		},
	);

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
		await flushFirstConnect();

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
		await flushFirstConnect();

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
		await flushFirstConnect();

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
		await flushFirstConnect();

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
					<RuiDateField locale="en-US" />
					<RuiFieldError />
				</RuiField>
				<RuiButton type="submit">Book</RuiButton>
			</RuiForm>,
		);

		await customElements.whenDefined('rui-form');
		await customElements.whenDefined('rui-field');
		await customElements.whenDefined('rui-date-field');
		await flushRender();
		await flushFirstConnect();

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
		await flushFirstConnect();

		const field = host.querySelector('rui-field') as RuiFieldElement;
		expect(field.querySelectorAll('rui-switch')).toHaveLength(1);
		expect(field.querySelectorAll('.rui-switch__track')).toHaveLength(1);
		expect(field.querySelectorAll('input[role="switch"]')).toHaveLength(1);

		host.remove();
	});
});
