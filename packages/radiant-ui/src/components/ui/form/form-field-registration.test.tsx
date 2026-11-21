import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx';
import { RuiForm } from './form';
import { RuiForm as RuiFormElement } from './form.script';
import { RuiField, RuiFieldError } from '../field';
import { RuiField as RuiFieldElement } from '../field/field.script';
import { RuiInput } from '../input';
import { RuiCheckbox } from '../checkbox';
import { RuiCheckboxGroup, RuiCheckboxGroupControl } from '../checkbox-group';
import { RuiCheckbox as RuiCheckboxScript } from '../checkbox/checkbox.script';
import { RuiCheckboxGroup as RuiCheckboxGroupScript } from '../checkbox-group/checkbox-group.script';
import { FormStore } from './form-store';
import type { FormContextValue } from './form-context';
import type { FormStateSnapshot, FormStateStore } from './form-state-store';

void RuiFormElement;
void RuiFieldElement;
void RuiCheckboxScript;
void RuiCheckboxGroupScript;

async function flushRender(): Promise<void> {
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve());
		});
	});
}

async function settle(): Promise<void> {
	await flushRender();
	await new Promise((resolve) => setTimeout(resolve, 0));
}

const cleanup: Array<() => void> = [];

afterEach(() => {
	for (const dispose of cleanup.splice(0)) {
		dispose();
	}
});

/** A host store that keeps every value, so only registration churn can make a value disappear. */
function createHostStore(): { store: FormStateStore; values: Record<string, unknown> } {
	const values: Record<string, unknown> = {};
	const listeners = new Set<() => void>();
	let snapshot: FormStateSnapshot = { values: { ...values }, errors: {} };
	const publish = () => {
		snapshot = { values: { ...values }, errors: snapshot.errors };
		for (const listener of [...listeners]) listener();
	};
	const store: FormStateStore = {
		getValue: (path) => values[path],
		setValue(path, value) {
			values[path] = value;
			publish();
		},
		blur() {},
		getSnapshot: () => snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		reset() {},
		async validate() {
			return true;
		},
		setErrors(_source, errors) {
			snapshot = { values: snapshot.values, errors };
			for (const listener of [...listeners]) listener();
		},
	};
	return { store, values };
}

function renderForm(store: FormStateStore | undefined) {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	root.render(
		<RuiForm store={store} defaultValues={{ n: '', accepted: false, tags: [] }}>
			<RuiField name="n" rules={{ required: 'Required' }}>
				<RuiInput />
				<RuiFieldError />
			</RuiField>
			<RuiField name="accepted">
				<RuiCheckbox />
			</RuiField>
			<RuiField name="tags">
				<RuiCheckboxGroup>
					<RuiCheckboxGroupControl>
						<RuiCheckbox value="a" />
						<RuiCheckbox value="b" />
					</RuiCheckboxGroupControl>
				</RuiCheckboxGroup>
			</RuiField>
		</RuiForm>,
	);
	cleanup.push(() => {
		root.unmount();
		host.remove();
	});
	return host;
}

describe('rui-field registration', () => {
	it('registers a built-in store field once, so its value never disappears', async () => {
		const seen: string[][] = [];
		const host = document.createElement('div');
		document.body.append(host);
		const form = document.createElement('rui-form') as RuiFormElement;
		const nativeForm = document.createElement('form');
		nativeForm.setAttribute('data-ref', 'form');
		nativeForm.noValidate = true;
		form.append(nativeForm);
		host.append(form);
		cleanup.push(() => host.remove());
		await customElements.whenDefined('rui-form');
		await flushRender();
		const context = (
			form as unknown as { formProvider: { getContext(): FormContextValue } }
		).formProvider.getContext();
		const store = context.store as FormStore;
		store.subscribe(() => seen.push(Object.keys(store.getValues()).sort()));

		for (const name of ['n', 'accepted']) {
			const field = document.createElement('rui-field') as RuiFieldElement;
			field.name = name;
			field.innerHTML = '<input data-rui-control type="text" />';
			nativeForm.append(field);
		}
		await settle();

		const full = ['accepted', 'n'];
		for (const keys of seen) {
			expect(keys).toEqual(full);
		}
	});

	for (const [label, makeStore] of [
		['built-in', () => undefined],
		['injected', () => createHostStore().store],
	] as const) {
		it(`keeps one registration per text, checkbox and array field (${label} store)`, async () => {
			const host = renderForm(makeStore());
			const form = host.querySelector('rui-form') as RuiFormElement;
			const registers = vi.fn();
			const unregisters = vi.fn();
			const actions = (
				form as unknown as { formProvider: { getContext(): FormContextValue } }
			).formProvider.getContext().actions;
			const original = actions.register;
			actions.register = (registration) => {
				registers(registration.name);
				const unregister = original(registration);
				return () => {
					unregisters(registration.name);
					unregister();
				};
			};
			await customElements.whenDefined('rui-field');
			await settle();
			form.querySelector('form')?.requestSubmit();
			await settle();

			expect(unregisters).not.toHaveBeenCalled();
			const names = registers.mock.calls.map(([name]) => name);
			expect(new Set(names).size).toBe(names.length);
		});
	}

	it('never shows a value missing from the built-in store across mount and an invalid submit', async () => {
		const host = renderForm(undefined);
		const form = host.querySelector('rui-form') as RuiFormElement;
		const seen: string[][] = [];
		await customElements.whenDefined('rui-field');
		await flushRender();
		const store = (
			form as unknown as { formProvider: { getContext(): FormContextValue } }
		).formProvider.getContext().store as FormStore;
		store.subscribe(() => seen.push(Object.keys(store.getValues()).sort()));

		form.querySelector('form')?.requestSubmit();
		await settle();

		expect(seen.length).toBeGreaterThan(0);
		for (const keys of seen) {
			expect(keys).toEqual(['accepted', 'n', 'tags']);
		}
	});

	it('moves a renamed field atomically in the built-in store', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const form = document.createElement('rui-form') as RuiFormElement;
		const nativeForm = document.createElement('form');
		nativeForm.setAttribute('data-ref', 'form');
		const field = document.createElement('rui-field') as RuiFieldElement;
		field.name = 'old';
		field.innerHTML = '<input data-rui-control type="text" />';
		nativeForm.append(field);
		form.append(nativeForm);
		host.append(form);
		cleanup.push(() => host.remove());
		await customElements.whenDefined('rui-field');
		await settle();
		const input = field.querySelector('input') as HTMLInputElement;
		input.value = 'kept';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		const store = (
			form as unknown as { formProvider: { getContext(): FormContextValue } }
		).formProvider.getContext().store as FormStore;
		const seen: Array<Record<string, unknown>> = [];
		store.subscribe(() => seen.push(store.getValues()));

		field.name = 'renamed';
		await settle();

		expect(seen.length).toBe(1);
		expect(seen[0]).toEqual({ renamed: 'kept' });
		expect(input.value).toBe('kept');
		expect(store.getRegisteredFieldNames()).toEqual(['renamed']);
	});
});
