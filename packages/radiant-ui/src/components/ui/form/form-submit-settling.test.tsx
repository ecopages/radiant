import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuiForm as RuiFormElement } from './form.script';
import { RuiField as RuiFieldElement } from '../field/field.script';
import type { FormContextValue } from './form-context';
import type { FormStore } from './form-store';
import type { FormStateSnapshot, FormStateStore } from './form-state-store';

void RuiFormElement;
void RuiFieldElement;

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

/** A store whose `validate` throws, as a validator reaching a failing network would. */
function createThrowingStore(error: Error): FormStateStore {
	const snapshot: FormStateSnapshot = { values: {}, errors: {} };
	return {
		getValue: () => undefined,
		setValue() {},
		blur() {},
		getSnapshot: () => snapshot,
		subscribe: () => () => {},
		reset() {},
		async validate() {
			throw error;
		},
		setErrors() {},
	};
}

async function mount(options: { store?: FormStateStore; rules?: Record<string, unknown> } = {}) {
	const form = document.createElement('rui-form') as RuiFormElement;
	if (options.store) {
		form.store = options.store;
	}
	const nativeForm = document.createElement('form');
	nativeForm.setAttribute('data-ref', 'form');
	nativeForm.noValidate = true;
	const field = document.createElement('rui-field') as RuiFieldElement;
	field.name = 'title';
	if (options.rules) {
		field.rules = options.rules;
	}
	field.innerHTML = '<input data-rui-control type="text" />';
	nativeForm.append(field);
	form.append(nativeForm);
	document.body.append(form);
	cleanup.push(() => form.remove());
	await customElements.whenDefined('rui-form');
	await customElements.whenDefined('rui-field');
	await flushRender();
	const context = (form as unknown as { formProvider: { getContext(): FormContextValue } }).formProvider.getContext();
	return { form, nativeForm, store: context.store as FormStore };
}

function watchUnhandled() {
	const unhandled = vi.fn();
	const errors = vi.fn();
	const onRejection = (event: PromiseRejectionEvent) => {
		event.preventDefault();
		unhandled(event.reason);
	};
	const onError = (event: ErrorEvent) => {
		event.preventDefault();
		errors(event.error);
	};
	window.addEventListener('unhandledrejection', onRejection);
	window.addEventListener('error', onError);
	cleanup.push(() => {
		window.removeEventListener('unhandledrejection', onRejection);
		window.removeEventListener('error', onError);
	});
	return { unhandled, errors };
}

describe('submission settling', () => {
	it('ends a built-in submission with rui-invalid when a validator throws', async () => {
		const boom = new Error('network');
		const watch = watchUnhandled();
		const { form, nativeForm, store } = await mount({
			rules: {
				validate: () => {
					throw boom;
				},
			},
		});
		const onInvalid = vi.fn();
		const onSubmit = vi.fn();
		form.addEventListener('rui-invalid', (event) => onInvalid((event as CustomEvent).detail));
		form.addEventListener('rui-submit', onSubmit);

		nativeForm.requestSubmit();
		await settle();

		expect(store.isSubmitting).toBe(false);
		expect(onSubmit).not.toHaveBeenCalled();
		expect(onInvalid).toHaveBeenCalledTimes(1);
		expect(onInvalid.mock.calls[0]?.[0].error).toBe(boom);
		expect(watch.unhandled).not.toHaveBeenCalled();
	});

	it('keeps isSubmitting true until an awaited onSubmit settles', async () => {
		const { form, nativeForm, store } = await mount();
		let release: () => void = () => {};
		form.onSubmit = () =>
			new Promise<void>((resolve) => {
				release = resolve;
			});

		nativeForm.requestSubmit();
		await settle();
		expect(store.isSubmitting).toBe(true);

		release();
		await settle();
		expect(store.isSubmitting).toBe(false);
	});

	it('clears isSubmitting and reports an onSubmit rejection without an unhandled rejection', async () => {
		const boom = new Error('server');
		const watch = watchUnhandled();
		const { form, nativeForm, store } = await mount();
		form.onSubmit = () => Promise.reject(boom);

		nativeForm.requestSubmit();
		await settle();

		expect(store.isSubmitting).toBe(false);
		expect(watch.unhandled).not.toHaveBeenCalled();
		expect(watch.errors).toHaveBeenCalledWith(boom);
	});

	it('ends an injected-store submission with rui-invalid when validate throws', async () => {
		const boom = new Error('network');
		const watch = watchUnhandled();
		const { form, nativeForm } = await mount({ store: createThrowingStore(boom) });
		const onInvalid = vi.fn();
		const onSubmit = vi.fn();
		form.addEventListener('rui-invalid', (event) => onInvalid((event as CustomEvent).detail));
		form.addEventListener('rui-submit', onSubmit);

		nativeForm.requestSubmit();
		await settle();

		expect(onSubmit).not.toHaveBeenCalled();
		expect(onInvalid).toHaveBeenCalledTimes(1);
		expect(onInvalid.mock.calls[0]?.[0].error).toBe(boom);
		expect(watch.unhandled).not.toHaveBeenCalled();
	});

	it('reports an injected-store onSubmit rejection without an unhandled rejection', async () => {
		const boom = new Error('server');
		const watch = watchUnhandled();
		const { form, nativeForm } = await mount({
			store: { ...createThrowingStore(boom), validate: async () => true },
		});
		form.onSubmit = () => Promise.reject(boom);

		nativeForm.requestSubmit();
		await settle();

		expect(watch.unhandled).not.toHaveBeenCalled();
		expect(watch.errors).toHaveBeenCalledWith(boom);
	});
});
