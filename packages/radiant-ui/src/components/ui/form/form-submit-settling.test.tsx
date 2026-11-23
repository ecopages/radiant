import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuiForm as RuiFormElement } from './form.script';
import { RuiField as RuiFieldElement } from '../field/field.script';
import type { FormContextValue } from '@/lib/form/form-context';
import type { FormStore } from '@/lib/form/form-store';
import type { FormStateStoreSnapshot, FormStateStore, FormStateValidateResult } from '@/lib/form/form-state-store';
import type { FieldError } from '@/lib/form/types';

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
	const snapshot: FormStateStoreSnapshot = { values: {}, errors: {}, warnings: {} };
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
		reportNative() {},
	};
}

async function mount(options: { store?: FormStateStore; rules?: Record<string, unknown> } = {}) {
	const form = document.createElement('rui-form') as RuiFormElement;
	if (options.store) {
		form.connect(options.store);
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
			store: { ...createThrowingStore(boom), validate: async () => ({ outcome: 'passed' }) },
		});
		form.onSubmit = () => Promise.reject(boom);

		nativeForm.requestSubmit();
		await settle();

		expect(watch.unhandled).not.toHaveBeenCalled();
		expect(watch.errors).toHaveBeenCalledWith(boom);
	});

	describe('one submission at a time', () => {
		/** A promise a test settles itself, as a slow server-side validator would. */
		function deferred<T>() {
			let resolve: (value: T) => void = () => {};
			let reject: (error: unknown) => void = () => {};
			const promise = new Promise<T>((res, rej) => {
				resolve = res;
				reject = rej;
			});
			return { promise, resolve, reject };
		}

		/**
		 * A store whose `validate` waits for the test, and counts how often it ran. Its snapshot holds
		 * `errors`, which the form reports when `validate` resolves `{ outcome: 'invalid' }`.
		 */
		function createSlowStore(
			pending: Array<ReturnType<typeof deferred<FormStateValidateResult>>>,
			errors: Record<string, FieldError> = {},
			values: Record<string, unknown> = { title: 'host' },
		) {
			const validate = vi.fn(() => {
				const next = deferred<FormStateValidateResult>();
				pending.push(next);
				return next.promise;
			});
			const snapshot: FormStateStoreSnapshot = { values, errors, warnings: {} };
			const store: FormStateStore = {
				...createThrowingStore(new Error('unused')),
				getSnapshot: () => snapshot,
				validate,
			};
			return { store, validate };
		}

		function listen(form: RuiFormElement) {
			const onSubmit = vi.fn();
			const onInvalid = vi.fn();
			form.addEventListener('rui-submit', onSubmit);
			form.addEventListener('rui-invalid', onInvalid);
			return { onSubmit, onInvalid };
		}

		it('ignores a second submit while the built-in store validates', async () => {
			const gate = deferred<boolean>();
			const validator = vi.fn(() => gate.promise);
			const { form, nativeForm } = await mount({ rules: { validate: validator } });
			const { onSubmit } = listen(form);
			const onSubmitProp = vi.fn();
			form.onSubmit = onSubmitProp;

			nativeForm.requestSubmit();
			nativeForm.requestSubmit();
			await settle();
			gate.resolve(true);
			await settle();

			expect(validator).toHaveBeenCalledTimes(1);
			expect(onSubmit).toHaveBeenCalledTimes(1);
			expect(onSubmitProp).toHaveBeenCalledTimes(1);
		});

		it('ignores a second submit while onSubmit is still running', async () => {
			const { form, nativeForm } = await mount();
			const { onSubmit } = listen(form);
			const gate = deferred<void>();
			form.onSubmit = () => gate.promise;

			nativeForm.requestSubmit();
			await settle();
			nativeForm.requestSubmit();
			await settle();
			expect(onSubmit).toHaveBeenCalledTimes(1);

			gate.resolve();
			await settle();
			nativeForm.requestSubmit();
			await settle();
			expect(onSubmit).toHaveBeenCalledTimes(2);
		});

		it('ignores a second submit while an injected store validates', async () => {
			const pending: Array<ReturnType<typeof deferred<FormStateValidateResult>>> = [];
			const { store, validate } = createSlowStore(pending);
			const { form, nativeForm } = await mount({ store });
			const { onSubmit } = listen(form);

			nativeForm.requestSubmit();
			nativeForm.requestSubmit();
			await settle();
			expect(validate).toHaveBeenCalledTimes(1);
			pending[0]?.resolve({ outcome: 'passed' });
			await settle();

			expect(validate).toHaveBeenCalledTimes(1);
			expect(onSubmit).toHaveBeenCalledTimes(1);
		});

		it('accepts a new submit once the first settles', async () => {
			const pending: Array<ReturnType<typeof deferred<FormStateValidateResult>>> = [];
			const { store, validate } = createSlowStore(pending, { title: { type: 'required' } });
			const { form, nativeForm } = await mount({ store });
			const { onSubmit, onInvalid } = listen(form);

			nativeForm.requestSubmit();
			await settle();
			pending[0]?.resolve({ outcome: 'invalid' });
			await settle();
			nativeForm.requestSubmit();
			await settle();
			pending[1]?.resolve({ outcome: 'passed' });
			await settle();

			expect(validate).toHaveBeenCalledTimes(2);
			expect(onInvalid).toHaveBeenCalledTimes(1);
			expect(onSubmit).toHaveBeenCalledTimes(1);
		});

		it('accepts a new submit after onSubmit throws', async () => {
			const watch = watchUnhandled();
			const { form, nativeForm } = await mount();
			const { onSubmit } = listen(form);
			form.onSubmit = () => Promise.reject(new Error('server'));

			nativeForm.requestSubmit();
			await settle();
			nativeForm.requestSubmit();
			await settle();

			expect(onSubmit).toHaveBeenCalledTimes(2);
			expect(watch.errors).toHaveBeenCalledTimes(2);
		});

		it('emits rui-invalid with the snapshot errors when the store resolves invalid, even with none', async () => {
			const pending: Array<ReturnType<typeof deferred<FormStateValidateResult>>> = [];
			const { store } = createSlowStore(pending);
			const { form, nativeForm } = await mount({ store });
			const { onSubmit, onInvalid } = listen(form);

			nativeForm.requestSubmit();
			await settle();
			pending[0]?.resolve({ outcome: 'invalid' });
			await settle();

			expect(onSubmit).not.toHaveBeenCalled();
			expect(onInvalid).toHaveBeenCalledTimes(1);
			expect(onInvalid.mock.calls[0]?.[0].detail).toEqual({ errors: {} });
		});

		it('ends without an event when the store resolves overtaken, and takes a new submit', async () => {
			const pending: Array<ReturnType<typeof deferred<FormStateValidateResult>>> = [];
			const { store, validate } = createSlowStore(pending);
			const { form, nativeForm } = await mount({ store });
			const { onSubmit, onInvalid } = listen(form);
			const onSubmitProp = vi.fn();
			form.onSubmit = onSubmitProp;

			nativeForm.requestSubmit();
			await settle();
			pending[0]?.resolve({ outcome: 'overtaken' });
			await settle();

			expect(onSubmit).not.toHaveBeenCalled();
			expect(onInvalid).not.toHaveBeenCalled();
			expect(onSubmitProp).not.toHaveBeenCalled();

			nativeForm.requestSubmit();
			await settle();
			pending[1]?.resolve({ outcome: 'passed' });
			await settle();
			expect(validate).toHaveBeenCalledTimes(2);
			expect(onSubmit).toHaveBeenCalledTimes(1);
		});

		it('accepts a new submit after validation throws', async () => {
			const pending: Array<ReturnType<typeof deferred<FormStateValidateResult>>> = [];
			const { store, validate } = createSlowStore(pending);
			const { form, nativeForm } = await mount({ store });
			const { onInvalid } = listen(form);

			nativeForm.requestSubmit();
			await settle();
			pending[0]?.reject(new Error('network'));
			await settle();
			nativeForm.requestSubmit();
			await settle();

			expect(validate).toHaveBeenCalledTimes(2);
			expect(onInvalid).toHaveBeenCalledTimes(1);
		});

		it('ends a submission without events when connect replaced its store before validation settled', async () => {
			const pending: Array<ReturnType<typeof deferred<FormStateValidateResult>>> = [];
			const { store } = createSlowStore(pending);
			const other = createSlowStore(pending).store;
			const { form, nativeForm } = await mount({ store });
			const { onSubmit, onInvalid } = listen(form);
			const onSubmitProp = vi.fn();
			form.onSubmit = onSubmitProp;

			nativeForm.requestSubmit();
			await settle();
			form.connect(other);
			await settle();
			pending[0]?.resolve({ outcome: 'passed' });
			await settle();

			expect(onSubmit).not.toHaveBeenCalled();
			expect(onInvalid).not.toHaveBeenCalled();
			expect(onSubmitProp).not.toHaveBeenCalled();
		});

		it('ends a submission without events when its disposer brought back the own store', async () => {
			const pending: Array<ReturnType<typeof deferred<FormStateValidateResult>>> = [];
			const { store } = createSlowStore(pending);
			const { form, nativeForm } = await mount();
			const disconnect = form.connect(store);
			await settle();
			const { onSubmit, onInvalid } = listen(form);
			const onSubmitProp = vi.fn();
			form.onSubmit = onSubmitProp;

			nativeForm.requestSubmit();
			await settle();
			disconnect();
			await settle();
			pending[0]?.resolve({ outcome: 'passed' });
			await settle();

			expect(onSubmit).not.toHaveBeenCalled();
			expect(onInvalid).not.toHaveBeenCalled();
			expect(onSubmitProp).not.toHaveBeenCalled();
		});

		it('ends an own-store submission without events when connect replaced the own store', async () => {
			const gate = deferred<boolean>();
			const { form, nativeForm } = await mount({ rules: { validate: () => gate.promise } });
			const { onSubmit, onInvalid } = listen(form);
			const onSubmitProp = vi.fn();
			form.onSubmit = onSubmitProp;

			nativeForm.requestSubmit();
			await settle();
			form.connect(createSlowStore([]).store);
			await settle();
			gate.resolve(true);
			await settle();

			expect(onSubmit).not.toHaveBeenCalled();
			expect(onInvalid).not.toHaveBeenCalled();
			expect(onSubmitProp).not.toHaveBeenCalled();
		});

		it('accepts a submit on the new store while the replaced one is still validating', async () => {
			const pending: Array<ReturnType<typeof deferred<FormStateValidateResult>>> = [];
			const { store } = createSlowStore(pending);
			const other = createSlowStore(pending, {}, { title: 'other' });
			const { form, nativeForm } = await mount({ store });
			const { onSubmit } = listen(form);

			nativeForm.requestSubmit();
			await settle();
			form.connect(other.store);
			await settle();
			nativeForm.requestSubmit();
			await settle();
			pending[0]?.resolve({ outcome: 'passed' });
			pending[1]?.resolve({ outcome: 'passed' });
			await settle();

			expect(other.validate).toHaveBeenCalledTimes(1);
			expect(onSubmit).toHaveBeenCalledTimes(1);
			expect(onSubmit.mock.calls[0]?.[0].detail).toEqual({ values: { title: 'other' } });
		});

		it('runs one submission per store when the own store is swapped away and back', async () => {
			const gate = deferred<boolean>();
			const validator = vi.fn(() => gate.promise);
			const { form, nativeForm } = await mount({ rules: { validate: validator } });
			const { onSubmit } = listen(form);

			nativeForm.requestSubmit();
			await settle();
			const disconnect = form.connect(createSlowStore([]).store);
			await settle();
			disconnect();
			await settle();
			nativeForm.requestSubmit();
			await settle();
			gate.resolve(true);
			await settle();

			expect(validator).toHaveBeenCalledTimes(1);
			expect(onSubmit).not.toHaveBeenCalled();

			nativeForm.requestSubmit();
			await settle();
			expect(validator).toHaveBeenCalledTimes(2);
			expect(onSubmit).toHaveBeenCalledTimes(1);
		});

		describe.each(['own', 'injected'] as const)('a form that leaves the document while validating (%s store)', (kind) => {
			async function startPending() {
				const pending: Array<ReturnType<typeof deferred<FormStateValidateResult>>> = [];
				const gate = deferred<boolean>();
				const mounted =
					kind === 'injected'
						? await mount({ store: createSlowStore(pending).store })
						: await mount({ rules: { validate: () => gate.promise } });
				const events = listen(mounted.form);
				const onSubmitProp = vi.fn();
				mounted.form.onSubmit = onSubmitProp;
				mounted.nativeForm.requestSubmit();
				await settle();
				const settleValidation = () => {
					pending[0]?.resolve({ outcome: 'passed' });
					gate.resolve(true);
				};
				return { ...mounted, ...events, onSubmitProp, settleValidation };
			}

			it('ends without events or onSubmit when it is removed', async () => {
				const { form, onSubmit, onInvalid, onSubmitProp, settleValidation } = await startPending();

				form.remove();
				settleValidation();
				await settle();

				expect(onSubmit).not.toHaveBeenCalled();
				expect(onInvalid).not.toHaveBeenCalled();
				expect(onSubmitProp).not.toHaveBeenCalled();
			});

			it('completes when it is removed and inserted again in the same task', async () => {
				const { form, onSubmit, onSubmitProp, settleValidation } = await startPending();

				form.remove();
				document.body.append(form);
				settleValidation();
				await settle();

				expect(onSubmit).toHaveBeenCalledTimes(1);
				expect(onSubmitProp).toHaveBeenCalledTimes(1);
			});
		});

		it('hands every submit to a submitHandler, which owns submission', async () => {
			const { store } = createSlowStore([]);
			const { form, nativeForm } = await mount();
			const gate = deferred<void>();
			const submitHandler = vi.fn(() => gate.promise);
			form.connect(store, { submitHandler });
			await settle();

			nativeForm.requestSubmit();
			nativeForm.requestSubmit();
			await settle();

			expect(submitHandler).toHaveBeenCalledTimes(2);
			gate.resolve();
		});
	});
});
