import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx';
import { RuiForm } from './form';
import { RuiForm as RuiFormElement } from './form.script';
import { RuiField, RuiFieldError } from '../field';
import { RuiInput } from '../input';
import { RuiField as RuiFieldScript } from '../field/field.script';
import { formContext, type FormContextValue } from './form-context';
import { ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import { findFieldControl, findFieldError, registerFieldControl } from './control-protocol';
import type { FormStateSnapshot, FormStateStore } from './form-state-store';
import type { FieldError } from './types';

void RuiFieldScript;
void RuiFormElement;

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

function readPath(tree: unknown, path: string): unknown {
	let node = tree;
	for (const key of path.split('.')) {
		if (typeof node !== 'object' || node === null) {
			return undefined;
		}
		node = Reflect.get(node, key);
	}
	return node;
}

function writePath(tree: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
	const [head, ...rest] = path.split('.');
	if (head === undefined) {
		return tree;
	}
	if (rest.length === 0) {
		return { ...tree, [head]: value };
	}
	const child = tree[head];
	const next = typeof child === 'object' && child !== null ? (child as Record<string, unknown>) : {};
	return { ...tree, [head]: writePath(next, rest.join('.'), value) };
}

type TestStoreOptions = {
	/** Make `validate` ignore errors other sources set, as a store with a narrow notion of validity would. */
	validateIgnoresOtherSources?: boolean;
	/** Returns validation errors for the whole tree; a path scope filters them. */
	validate?: (values: Record<string, unknown>) => Record<string, FieldError>;
};

/** A minimal host store: nested values by dotted path, per-source errors, stable snapshots. */
function createTestStore(initial: Record<string, unknown>, options: TestStoreOptions = {}) {
	let values = initial;
	const sources = new Map<string, Record<string, FieldError>>();
	const listeners = new Set<() => void>();
	const setErrorsCalls: Array<{ source: string; errors: Record<string, FieldError> }> = [];

	function mergedErrors(): Record<string, FieldError> {
		const merged: Record<string, FieldError> = {};
		for (const errors of sources.values()) {
			for (const [path, error] of Object.entries(errors)) {
				merged[path] ??= error;
			}
		}
		return merged;
	}

	function buildSnapshot(): FormStateSnapshot {
		return Object.freeze({ values, errors: Object.freeze(mergedErrors()) });
	}

	let snapshot = buildSnapshot();

	function publish(): void {
		snapshot = buildSnapshot();
		for (const listener of [...listeners]) {
			listener();
		}
	}

	const store: FormStateStore = {
		getValue: (path) => readPath(values, path),
		setValue(path, value) {
			values = writePath(values, path, value);
			publish();
		},
		getSnapshot: () => snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		reset(next) {
			values = next ?? initial;
			sources.clear();
			publish();
		},
		async validate(paths) {
			const found = options.validate?.(values) ?? {};
			const scoped: Record<string, FieldError> = {};
			for (const [path, error] of Object.entries(found)) {
				if (!paths || paths.includes(path)) {
					scoped[path] = error;
				}
			}
			const previous = sources.get('validation') ?? {};
			const kept = paths
				? Object.fromEntries(Object.entries(previous).filter(([path]) => !paths.includes(path)))
				: {};
			sources.set('validation', { ...kept, ...scoped });
			publish();
			if (options.validateIgnoresOtherSources) {
				return Object.keys(sources.get('validation') ?? {}).length === 0;
			}
			const inScope = Object.keys(mergedErrors()).filter((path) => !paths || paths.includes(path));
			return inScope.length === 0;
		},
		setErrors(source, errors) {
			setErrorsCalls.push({ source, errors });
			sources.set(source, errors);
			publish();
		},
	};

	return { store, setErrorsCalls, listenerCount: () => listeners.size };
}

function titleRequired(values: Record<string, unknown>): Record<string, FieldError> {
	return values.title ? {} : { title: { type: 'validation', message: 'Title is required' } };
}

class CodeFace extends HTMLElement {
	static get formAssociated(): boolean {
		return true;
	}
	readonly internals = this.attachInternals();
	get validity(): ValidityState {
		return this.internals.validity;
	}
	get validationMessage(): string {
		return this.internals.validationMessage;
	}
}

const cleanup: Array<() => void> = [];

afterEach(() => {
	for (const dispose of cleanup.splice(0)) {
		dispose();
	}
});

async function mountInputs(store: FormStateStore | undefined, extra: { defaultValues?: Record<string, unknown> } = {}) {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	root.render(
		<RuiForm store={store} defaultValues={extra.defaultValues}>
			<RuiField name="title">
				<RuiInput />
				<RuiFieldError />
			</RuiField>
			<RuiField name="profile.name">
				<RuiInput />
			</RuiField>
		</RuiForm>,
	);
	cleanup.push(() => {
		root.unmount();
		host.remove();
	});
	await customElements.whenDefined('rui-form');
	await customElements.whenDefined('rui-field');
	await flushRender();
	const form = host.querySelector('rui-form') as RuiFormElement;
	const [title, name] = Array.from(host.querySelectorAll('rui-field')).map(
		(field) => findFieldControl(field as HTMLElement) as HTMLInputElement,
	);
	if (!form || !title || !name) {
		throw new Error('Expected mounted form');
	}
	return { form, title, name, host };
}

async function mountCode(store: FormStateStore) {
	if (!customElements.get('x-code-face')) customElements.define('x-code-face', CodeFace);
	registerFieldControl('x-code-face', {
		submission: 'host',
		read: (host) => host.getAttribute('value') ?? '',
		write: (host, value) => host.setAttribute('value', value == null ? '' : String(value)),
	});
	const form = document.createElement('rui-form') as RuiFormElement;
	form.store = store;
	const nativeForm = document.createElement('form');
	nativeForm.className = 'rui-form';
	nativeForm.setAttribute('data-ref', 'form');
	nativeForm.noValidate = true;
	const field = document.createElement('rui-field') as HTMLElement & { name: string };
	field.name = 'code';
	field.innerHTML = `
		<x-code-face></x-code-face>
		<p class="rui-field__error" data-rui-field-error role="alert" hidden></p>
	`;
	nativeForm.append(field);
	form.append(nativeForm);
	document.body.append(form);
	cleanup.push(() => form.remove());
	await customElements.whenDefined('rui-form');
	await customElements.whenDefined('rui-field');
	await flushRender();
	return { form, nativeForm, field, face: field.querySelector('x-code-face') as CodeFace };
}

function type(input: HTMLInputElement, value: string): void {
	input.focus();
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}

describe('rui-form with an injected store', () => {
	it('writes a typed control value into the store by dotted path', async () => {
		const { store } = createTestStore({ title: '', profile: { name: '' } });
		const { title, name } = await mountInputs(store);

		type(title, 'Hello');
		type(name, 'Ada');
		await settle();

		expect(store.getValue('title')).toBe('Hello');
		expect(store.getValue('profile.name')).toBe('Ada');
		expect(store.getSnapshot().values).toEqual({ title: 'Hello', profile: { name: 'Ada' } });
	});

	it('seeds controls from the store and follows later store writes', async () => {
		const { store } = createTestStore({ title: 'Initial', profile: { name: 'Grace' } });
		const { title, name } = await mountInputs(store);

		expect(title.value).toBe('Initial');
		expect(name.value).toBe('Grace');

		store.setValue('title', 'Changed');
		store.setValue('profile.name', 'Hopper');
		await settle();

		expect(title.value).toBe('Changed');
		expect(name.value).toBe('Hopper');
	});

	it('does not write back to the store when a store write reaches a control', async () => {
		const { store } = createTestStore({ title: 'Initial', profile: { name: '' } });
		const setValue = vi.spyOn(store, 'setValue');
		await mountInputs(store);

		store.setValue('title', 'Changed');
		await settle();

		expect(setValue).toHaveBeenCalledTimes(1);
	});

	it('resets controls when the store resets', async () => {
		const { store } = createTestStore({ title: 'Initial', profile: { name: '' } });
		const { title } = await mountInputs(store);

		type(title, 'Typed');
		await settle();
		expect(store.getValue('title')).toBe('Typed');

		store.reset();
		await settle();

		expect(title.value).toBe('Initial');
	});

	it('resets the store when the native form resets', async () => {
		const { store } = createTestStore({ title: 'Initial', profile: { name: '' } });
		const { title, host } = await mountInputs(store);

		type(title, 'Typed');
		await settle();
		host.querySelector('form')?.dispatchEvent(new Event('reset', { bubbles: true, cancelable: true }));
		await settle();

		expect(store.getValue('title')).toBe('Initial');
		expect(title.value).toBe('Initial');
	});

	it('contributes native control validity through setErrors and presents it on the field', async () => {
		const { store, setErrorsCalls } = createTestStore({ code: '' });
		const { form, nativeForm, field, face } = await mountCode(store);
		face.internals.setValidity({ valueMissing: true }, 'Enter the code');
		const onSubmit = vi.fn();
		const onInvalid = vi.fn();
		form.addEventListener('rui-submit', onSubmit);
		form.addEventListener('rui-invalid', (event) => onInvalid((event as CustomEvent).detail));

		nativeForm.requestSubmit();
		await settle();

		expect(onInvalid.mock.calls[0]?.[0].errors.code.type).toBe('native');
		expect(setErrorsCalls.at(-1)).toEqual({
			source: 'native',
			errors: { code: { type: 'native', message: 'Enter the code' } },
		});
		expect(onSubmit).not.toHaveBeenCalled();
		expect(findFieldError(field)?.textContent).toBe('Enter the code');
		expect(face.getAttribute('aria-invalid')).toBe('true');
	});

	it('clears the native source once the control is valid again', async () => {
		const { store, setErrorsCalls } = createTestStore({ code: '' });
		const { nativeForm, field, face } = await mountCode(store);
		face.internals.setValidity({ valueMissing: true }, 'Enter the code');
		nativeForm.requestSubmit();
		await settle();

		face.setAttribute('value', '123456');
		face.internals.setValidity({});
		face.dispatchEvent(new CustomEvent('rui-change', { bubbles: true, composed: true }));
		await settle();

		expect(setErrorsCalls.at(-1)?.source).toBe('native');
		expect(setErrorsCalls.at(-1)?.errors).toEqual({});
		expect(findFieldError(field)?.hidden).toBe(true);
	});

	it('blocks submit and emits rui-invalid when the store reports errors', async () => {
		const { store } = createTestStore(
			{ title: '', profile: { name: '' } },
			{
				validate: titleRequired,
			},
		);
		const { form, host } = await mountInputs(store);
		const onSubmit = vi.fn();
		const onInvalid = vi.fn();
		form.addEventListener('rui-submit', onSubmit);
		form.addEventListener('rui-invalid', (event) => onInvalid((event as CustomEvent).detail));

		host.querySelector('form')?.requestSubmit();
		await settle();

		expect(onSubmit).not.toHaveBeenCalled();
		expect(onInvalid).toHaveBeenCalledTimes(1);
		expect(onInvalid.mock.calls[0]?.[0].errors.title.message).toBe('Title is required');
		const field = host.querySelector('rui-field') as HTMLElement;
		expect(findFieldError(field)?.textContent).toBe('Title is required');
	});

	it('emits rui-submit with the store values when the store is valid', async () => {
		const { store } = createTestStore({ title: 'Ready', profile: { name: 'Ada' } });
		const { form, host } = await mountInputs(store);
		const onSubmit = vi.fn();
		const onInvalid = vi.fn();
		form.addEventListener('rui-submit', (event) => onSubmit((event as CustomEvent).detail));
		form.addEventListener('rui-invalid', onInvalid);

		host.querySelector('form')?.requestSubmit();
		await settle();

		expect(onInvalid).not.toHaveBeenCalled();
		expect(onSubmit).toHaveBeenCalledWith({ values: { title: 'Ready', profile: { name: 'Ada' } } });
	});

	it('validates a changed field on change when mode is onChange', async () => {
		const { store } = createTestStore({ title: 'x', profile: { name: '' } }, { validate: titleRequired });
		const spy = vi.spyOn(store, 'validate');
		const { form, title } = await mountInputs(store);
		form.setAttribute('mode', 'onChange');
		await settle();

		type(title, '');
		await settle();

		expect(spy).toHaveBeenCalledWith(['title']);
		const field = form.querySelector('rui-field') as HTMLElement;
		expect(findFieldError(field)?.textContent).toBe('Title is required');
	});

	it('moves controls to a swapped store and stops writing to the old one', async () => {
		const first = createTestStore({ title: 'First', profile: { name: '' } });
		const second = createTestStore({ title: 'Second', profile: { name: '' } });
		const { form, title } = await mountInputs(first.store);

		form.store = second.store;
		await settle();
		expect(title.value).toBe('Second');

		type(title, 'Typed');
		await settle();
		expect(second.store.getValue('title')).toBe('Typed');
		expect(first.store.getValue('title')).toBe('First');

		first.store.setValue('title', 'Ignored');
		await settle();
		expect(title.value).toBe('Typed');
	});

	it('falls back to its own store when the injected store is removed', async () => {
		const { store } = createTestStore({ title: 'Injected', profile: { name: '' } });
		const { form, title } = await mountInputs(store, { defaultValues: { title: 'Own' } });
		expect(title.value).toBe('Injected');

		form.store = undefined;
		await settle();
		expect(title.value).toBe('Own');

		type(title, 'Typed');
		await settle();
		expect(store.getValue('title')).toBe('Injected');
	});

	it('blocks submit on native validity even when the store ignores the native source', async () => {
		const { store } = createTestStore({ code: '' }, { validateIgnoresOtherSources: true });
		const { form, nativeForm, face } = await mountCode(store);
		face.internals.setValidity({ valueMissing: true }, 'Enter the code');
		const onSubmit = vi.fn();
		form.addEventListener('rui-submit', onSubmit);

		nativeForm.requestSubmit();
		await settle();

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('does not validate while typing in the default onSubmit mode', async () => {
		const { store } = createTestStore({ title: '', profile: { name: '' } }, { validate: titleRequired });
		const validate = vi.spyOn(store, 'validate');
		const { title, host } = await mountInputs(store);

		type(title, 'a');
		title.blur();
		await settle();
		expect(validate).not.toHaveBeenCalled();

		host.querySelector('form')?.requestSubmit();
		await settle();
		expect(validate).toHaveBeenCalledWith();
	});

	it('writes a field default into the store only when the store has no value', async () => {
		const { store } = createTestStore({ seeded: 'kept' });
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<RuiForm store={store}>
				<RuiField name="seeded" defaultValue="ignored">
					<RuiInput />
				</RuiField>
				<RuiField name="fresh" defaultValue="from-field">
					<RuiInput />
				</RuiField>
			</RuiForm>,
		);
		cleanup.push(() => {
			root.unmount();
			host.remove();
		});
		await customElements.whenDefined('rui-field');
		await flushRender();

		expect(store.getValue('seeded')).toBe('kept');
		expect(store.getValue('fresh')).toBe('from-field');
	});

	it('exposes the injected store through the form context', async () => {
		const { store } = createTestStore({ title: '', profile: { name: '' } });
		const { host } = await mountInputs(store);
		let context: FormContextValue | undefined;
		host.querySelector('rui-field')?.dispatchEvent(
			new ContextSubscriptionRequestEvent(formContext, (value) => {
				context = value;
			}),
		);

		expect(context?.store).toBe(store);
	});

	it('stops listening to the store when the form disconnects or swaps', async () => {
		const first = createTestStore({ title: 'First', profile: { name: '' } });
		const second = createTestStore({ title: 'Second', profile: { name: '' } });
		const { form } = await mountInputs(first.store);
		expect(first.listenerCount()).toBe(1);

		form.store = second.store;
		await settle();
		expect(first.listenerCount()).toBe(0);
		expect(second.listenerCount()).toBe(1);

		form.remove();
		expect(second.listenerCount()).toBe(0);
	});

	it('returns to the values its own store held before the injection', async () => {
		const { form, title } = await mountInputs(undefined, { defaultValues: { title: 'Own' } });
		type(title, 'Typed');
		await settle();

		form.store = createTestStore({ title: 'Injected', profile: { name: '' } }).store;
		await settle();
		expect(title.value).toBe('Injected');

		form.store = undefined;
		await settle();
		expect(title.value).toBe('Typed');
	});

	it('keeps uncommitted control input when the store notifies for another reason', async () => {
		const { store } = createTestStore({ title: 'Initial', profile: { name: '' } });
		const { title, name } = await mountInputs(store);
		name.value = 'half-typed';

		store.setErrors('server', { title: { type: 'server', message: 'Taken' } });
		store.setValue('title', 'Changed');
		await settle();

		expect(name.value).toBe('half-typed');
		expect(title.value).toBe('Changed');
	});

	it('still rewrites uncommitted input on a native form reset', async () => {
		const { store } = createTestStore({ title: 'Initial', profile: { name: '' } });
		const { title, host } = await mountInputs(store);
		title.value = 'half-typed';

		host.querySelector('form')?.dispatchEvent(new Event('reset', { bubbles: true, cancelable: true }));
		await settle();

		expect(title.value).toBe('Initial');
	});

	it('keeps store values in the controls after a real native form reset', async () => {
		const { store } = createTestStore({ title: 'Initial', profile: { name: '' } });
		const { title, host } = await mountInputs(store);
		type(title, 'Typed');
		await settle();

		host.querySelector('form')?.reset();
		await settle();

		expect(store.getValue('title')).toBe('Initial');
		expect(title.value).toBe('Initial');
	});

	it('writes a changed Date value into a control', async () => {
		const { store } = createTestStore({ title: new Date('2026-01-01'), profile: { name: '' } });
		const { title } = await mountInputs(store);
		const written: unknown[] = [];
		Object.defineProperty(title, 'value', { configurable: true, get: () => '', set: (v) => written.push(v) });

		store.setValue('title', new Date('2026-02-01'));
		await settle();

		expect(written.length).toBeGreaterThan(0);
	});
});
