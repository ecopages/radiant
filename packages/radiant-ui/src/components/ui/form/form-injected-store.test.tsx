import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from '@ecopages/jsx';
import { RuiForm } from './form';
import { RuiForm as RuiFormElement } from './form.script';
import { RuiField, RuiFieldError, RuiFieldWarning } from '../field';
import { RuiInput } from '../input';
import { RuiCheckbox } from '../checkbox';
import { RuiCheckboxGroup, RuiCheckboxGroupControl } from '../checkbox-group';
import { RuiCheckbox as RuiCheckboxScript } from '../checkbox/checkbox.script';
import { RuiField as RuiFieldScript } from '../field/field.script';
import { formContext, type FormContextValue } from './form-context';
import { ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import { findFieldControl, findFieldError, registerFieldControl } from './control-protocol';
import type { FormStateStore, FormStateStoreSnapshot, NativeValidity } from './form-state-store';
import type { FieldError } from './types';
import type { RuiFormFormatError } from './form.script';

void RuiFieldScript;
void RuiFormElement;
void RuiCheckboxScript;

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
	/** Drop host errors at a path when that path is written, as a store clearing stale errors would. */
	clearHostErrorsOnWrite?: boolean;
	/** Returns validation errors for the whole tree. */
	validate?: (values: Record<string, unknown>) => Record<string, FieldError>;
	/** Returns warnings for the whole tree; a warning shows always and never blocks. */
	warn?: (values: Record<string, unknown>) => Record<string, FieldError>;
	/**
	 * `always` shows every error the store holds. `validated` is a store that owns
	 * display timing: an error shows only for a path the user blurred or a `validate`
	 * call covered, so a control's native problem stays hidden until then.
	 */
	display?: 'always' | 'validated';
};

type TestStore = FormStateStore & { setHostErrors(errors: Record<string, FieldError>): void };

type Call = { kind: 'setValue' | 'blur' | 'validate' | 'releaseNative'; path?: string; native?: unknown };

/**
 * A host store that owns validation timing and display: nested values by dotted
 * path, native validity facts that travel with the call they describe (and are
 * dropped by a write that carries none), host errors, warnings, stable snapshots.
 */
function createTestStore(initial: Record<string, unknown>, options: TestStoreOptions = {}) {
	let values = initial;
	let native: Record<string, NativeValidity> = {};
	let hostErrors: Record<string, FieldError> = {};
	const shown = new Set<string>();
	let allShown = false;
	const listeners = new Set<() => void>();
	const blurCalls: string[] = [];
	const calls: Call[] = [];
	let notifications = 0;

	function setFact(path: string, fact: NativeValidity | null | undefined): void {
		if (fact) {
			native = { ...native, [path]: fact };
		} else if (path in native) {
			const { [path]: _gone, ...rest } = native;
			native = rest;
		}
	}

	function allErrors(): Record<string, FieldError> {
		const errors: Record<string, FieldError> = {};
		for (const [path, fact] of Object.entries(native)) {
			errors[path] = { type: fact.type, params: fact.params, message: fact.message, source: 'native' };
		}
		Object.assign(errors, options.validate?.(values) ?? {});
		Object.assign(errors, hostErrors);
		return errors;
	}

	function visibleErrors(): Record<string, FieldError> {
		const errors = allErrors();
		if (options.display !== 'validated' || allShown) {
			return errors;
		}
		return Object.fromEntries(Object.entries(errors).filter(([path]) => shown.has(path) || path === '__root__'));
	}

	function buildSnapshot(): FormStateStoreSnapshot {
		return Object.freeze({
			values,
			errors: Object.freeze(visibleErrors()),
			warnings: Object.freeze(options.warn?.(values) ?? {}),
		});
	}

	let snapshot = buildSnapshot();

	function publish(): void {
		snapshot = buildSnapshot();
		notifications += 1;
		for (const listener of [...listeners]) {
			listener();
		}
	}

	const store: TestStore = {
		getValue: (path) => readPath(values, path),
		setValue(path, value, opts) {
			calls.push({ kind: 'setValue', path, native: opts?.native });
			values = writePath(values, path, value);
			setFact(path, opts?.native);
			if (options.clearHostErrorsOnWrite) {
				const { [path]: _removed, ...rest } = hostErrors;
				hostErrors = rest;
			}
			publish();
		},
		blur(path, opts) {
			calls.push({ kind: 'blur', path, native: opts?.native });
			blurCalls.push(path);
			if (opts?.native !== undefined) {
				setFact(path, opts.native);
			}
			shown.add(path);
			publish();
		},
		getSnapshot: () => snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		reset() {
			values = initial;
			hostErrors = {};
			native = {};
			shown.clear();
			allShown = false;
			publish();
		},
		async validate(paths, opts) {
			calls.push({ kind: 'validate', native: opts?.native });
			for (const [path, fact] of Object.entries(opts?.native ?? {})) {
				setFact(path, fact);
			}
			for (const path of paths ?? []) {
				shown.add(path);
			}
			allShown ||= !paths;
			publish();
			return Object.keys(allErrors()).filter((path) => !paths || paths.includes(path)).length === 0;
		},
		releaseNative(path) {
			calls.push({ kind: 'releaseNative', path });
			setFact(path, null);
		},
		setHostErrors(errors) {
			hostErrors = errors;
			publish();
		},
	};

	return {
		store,
		calls,
		facts: () => native,
		blurCalls,
		notifications: () => notifications,
		listenerCount: () => listeners.size,
	};
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

	it('reports native control validity as an input and presents what the store shows', async () => {
		const { store, facts } = createTestStore({ code: '' });
		const { form, nativeForm, field, face } = await mountCode(store);
		face.internals.setValidity({ valueMissing: true }, 'Enter the code');
		const onSubmit = vi.fn();
		const onInvalid = vi.fn();
		form.addEventListener('rui-submit', onSubmit);
		form.addEventListener('rui-invalid', (event) => onInvalid((event as CustomEvent).detail));

		nativeForm.requestSubmit();
		await settle();

		expect(onInvalid.mock.calls[0]?.[0].errors.code.type).toBe('valueMissing');
		expect(facts()).toEqual({ code: { type: 'valueMissing', message: 'Enter the code' } });
		expect(onSubmit).not.toHaveBeenCalled();
		expect(findFieldError(field)?.textContent).toBe('Enter the code');
		expect(face.getAttribute('aria-invalid')).toBe('true');
	});

	it('stops reporting native validity once the control is valid again', async () => {
		const { store, facts } = createTestStore({ code: '' });
		const { nativeForm, field, face } = await mountCode(store);
		face.internals.setValidity({ valueMissing: true }, 'Enter the code');
		nativeForm.requestSubmit();
		await settle();

		face.setAttribute('value', '123456');
		face.internals.setValidity({});
		face.dispatchEvent(new CustomEvent('rui-change', { bubbles: true, composed: true }));
		await settle();

		expect(facts()).toEqual({});
		expect(store.getSnapshot().errors.code).toBeUndefined();
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

		store.setHostErrors({ title: { type: 'server', message: 'Taken' } });
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

	it('does not echo a store write back when a control emits rui-change for programmatic writes', async () => {
		if (!customElements.get('x-echo')) {
			customElements.define(
				'x-echo',
				class extends HTMLElement {
					static get formAssociated(): boolean {
						return true;
					}
				},
			);
		}
		registerFieldControl('x-echo', {
			submission: 'none',
			read: (host) => host.getAttribute('value') ?? '',
			write: (host, value) => {
				host.setAttribute('value', value == null ? '' : String(value));
				host.dispatchEvent(new CustomEvent('rui-change', { bubbles: true, composed: true }));
			},
		});
		const { store } = createTestStore({ echo: 'a' });
		const setValue = vi.spyOn(store, 'setValue');
		const form = document.createElement('rui-form') as RuiFormElement;
		form.store = store;
		const nativeForm = document.createElement('form');
		nativeForm.setAttribute('data-ref', 'form');
		const field = document.createElement('rui-field') as HTMLElement & { name: string };
		field.name = 'echo';
		field.innerHTML = '<x-echo></x-echo>';
		nativeForm.append(field);
		form.append(nativeForm);
		document.body.append(form);
		cleanup.push(() => form.remove());
		await customElements.whenDefined('rui-field');
		await flushRender();
		setValue.mockClear();

		store.setValue('echo', 'b');
		await settle();

		expect(setValue).toHaveBeenCalledTimes(1);
	});

	it('writes uncommitted control input on submit before validating', async () => {
		const { store } = createTestStore({ title: '', profile: { name: '' } });
		const validate = vi.spyOn(store, 'validate');
		const { form, title, host } = await mountInputs(store);
		const onSubmit = vi.fn();
		form.addEventListener('rui-submit', (event) => onSubmit((event as CustomEvent).detail.values));
		title.value = 'silent';

		host.querySelector('form')?.requestSubmit();
		await settle();

		expect(store.getValue('title')).toBe('silent');
		expect(onSubmit.mock.calls[0]?.[0].title).toBe('silent');
		expect(validate).toHaveBeenCalledWith(undefined, { native: expect.any(Object) });
	});

	it('calls onSubmit with the store values when the store is valid', async () => {
		const { store } = createTestStore({ title: 'Ready', profile: { name: '' } });
		const { form, host } = await mountInputs(store);
		const onSubmit = vi.fn();
		form.onSubmit = onSubmit;

		host.querySelector('form')?.requestSubmit();
		await settle();

		expect(onSubmit).toHaveBeenCalledWith({ title: 'Ready', profile: { name: '' } });
	});

	it('writes the control value then reports blur, and never validates itself', async () => {
		const { store, blurCalls } = createTestStore({ title: '', profile: { name: '' } });
		const validate = vi.spyOn(store, 'validate');
		const { title } = await mountInputs(store);

		title.focus();
		title.value = 'typed';
		title.blur();
		await settle();

		expect(store.getValue('title')).toBe('typed');
		expect(blurCalls).toEqual(['title']);
		type(title, 'more');
		await settle();
		expect(validate).not.toHaveBeenCalled();
	});

	it('ignores mode, revalidate-mode and presents exactly the snapshot errors', async () => {
		const { store } = createTestStore({ title: '', profile: { name: '' } });
		const { form } = await mountInputs(store);
		form.setAttribute('mode', 'onSubmit');
		store.setHostErrors({ title: { type: 'server', message: 'Taken' } });
		await settle();

		const field = form.querySelector('rui-field') as HTMLElement;
		expect(findFieldError(field)?.textContent).toBe('Taken');
		expect(findFieldError(field)?.hidden).toBe(false);
	});

	it('does not seed field defaults into the store', async () => {
		const { store } = createTestStore({ seeded: 'kept' });
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<RuiForm store={store}>
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

		expect(store.getValue('fresh')).toBeUndefined();
	});

	it('re-reads native validity on every change, not from an earlier read', async () => {
		const { store, facts } = createTestStore({ code: '' });
		const { face } = await mountCode(store);
		face.internals.setValidity({ valueMissing: true }, 'Enter the code');
		face.dispatchEvent(new CustomEvent('rui-change', { bubbles: true, composed: true }));
		await settle();
		expect(facts()).toEqual({ code: { type: 'valueMissing', message: 'Enter the code' } });
		store.reset();
		face.internals.setValidity({});
		face.dispatchEvent(new CustomEvent('rui-change', { bubbles: true, composed: true }));
		await settle();

		expect(facts()).toEqual({});
	});

	it('picks up store changes made while the form was disconnected', async () => {
		const { store } = createTestStore({ title: 'A', profile: { name: '' } });
		const { form, title } = await mountInputs(store);
		const parent = form.parentElement as HTMLElement;
		form.remove();

		store.setValue('title', 'changed');
		parent.append(form);
		await settle();

		expect(title.value).toBe('changed');
	});

	it('does not subscribe to a store swapped in while disconnected', async () => {
		const first = createTestStore({ title: 'A', profile: { name: '' } });
		const second = createTestStore({ title: 'B', profile: { name: '' } });
		const { form } = await mountInputs(first.store);
		const parent = form.parentElement as HTMLElement;
		form.remove();

		form.store = second.store;
		await settle();
		expect(first.listenerCount()).toBe(0);
		expect(second.listenerCount()).toBe(0);

		parent.append(form);
		await settle();
		expect(second.listenerCount()).toBe(1);
	});

	it('writes an object value whose keys differ from the store value', async () => {
		const { store } = createTestStore({ range: { end: '2026-01-01' } });
		const form = document.createElement('rui-form') as RuiFormElement;
		form.store = store;
		const nativeForm = document.createElement('form');
		nativeForm.setAttribute('data-ref', 'form');
		const field = document.createElement('rui-field') as HTMLElement & { name: string };
		field.name = 'range';
		field.innerHTML = '<x-range></x-range>';
		if (!customElements.get('x-range')) customElements.define('x-range', class extends HTMLElement {});
		let current: unknown = { end: '2026-01-01' };
		registerFieldControl('x-range', {
			submission: 'none',
			read: () => current,
			write: (_host, value) => {
				current = value;
			},
		});
		nativeForm.append(field);
		form.append(nativeForm);
		document.body.append(form);
		cleanup.push(() => form.remove());
		await customElements.whenDefined('rui-field');
		await flushRender();

		current = { start: null };
		nativeForm.requestSubmit();
		await settle();
		expect(store.getValue('range')).toEqual({ start: null });

		current = { end: null };
		nativeForm.requestSubmit();
		await settle();
		expect(store.getValue('range')).toEqual({ end: null });

		store.setValue('range', {});
		current = { start: null };
		nativeForm.requestSubmit();
		await settle();
		expect(store.getValue('range')).toEqual({ start: null });
	});

	it('leaves errors cleared after a native form reset until the next interaction', async () => {
		const { store } = createTestStore({ code: '' }, { display: 'validated' });
		const { nativeForm, face } = await mountCode(store);
		face.internals.setValidity({ valueMissing: true }, 'Enter the code');
		nativeForm.requestSubmit();
		await settle();
		expect(store.getSnapshot().errors.code).toBeDefined();

		nativeForm.reset();
		await settle();

		expect(store.getSnapshot().errors.code).toBeUndefined();
	});

	it('withdraws its native validity from the host store while detached', async () => {
		const { store, facts } = createTestStore({ code: '' });
		const { form, nativeForm, face } = await mountCode(store);
		face.internals.setValidity({ valueMissing: true }, 'Enter the code');
		nativeForm.requestSubmit();
		await settle();
		expect(store.getSnapshot().errors.code).toBeDefined();

		form.remove();

		expect(facts()).toEqual({});
	});

	it('does not write an untouched empty control over a store value of undefined on submit', async () => {
		const { store } = createTestStore({ title: undefined, profile: { name: 'Ada' } });
		store.setHostErrors({ title: { type: 'server', message: 'Taken' } });
		const setValue = vi.spyOn(store, 'setValue');
		const { host } = await mountInputs(store);
		setValue.mockClear();

		host.querySelector('form')?.requestSubmit();
		await settle();

		expect(setValue).not.toHaveBeenCalled();
		expect(store.getSnapshot().errors.title?.message).toBe('Taken');
	});

	it('writes a control the user emptied after typing', async () => {
		const { store } = createTestStore({ title: undefined, profile: { name: '' } });
		const { title, host } = await mountInputs(store);
		type(title, 'a');
		await settle();
		title.value = '';

		host.querySelector('form')?.requestSubmit();
		await settle();

		expect(store.getValue('title')).toBe('');
	});

	describe('submitHandler', () => {
		it('flushes control values and native validity, then hands the form to the host', async () => {
			const { store, calls } = createTestStore({ title: '', profile: { name: '' } });
			const validate = vi.spyOn(store, 'validate');
			const { form, title, host } = await mountInputs(store);
			const seen: unknown[] = [];
			form.submitHandler = (context) => {
				seen.push(
					context.store.getValue('title'),
					calls.some((call) => call.kind === 'setValue'),
				);
				expect(context.store).toBe(store);
			};
			const onSubmit = vi.fn();
			const onInvalid = vi.fn();
			form.addEventListener('rui-submit', onSubmit);
			form.addEventListener('rui-invalid', onInvalid);
			title.value = 'silent';

			host.querySelector('form')?.requestSubmit();
			await settle();

			expect(seen).toEqual(['silent', true]);
			expect(validate).not.toHaveBeenCalled();
			expect(onSubmit).not.toHaveBeenCalled();
			expect(onInvalid).not.toHaveBeenCalled();
		});

		it('offers a native submit that follows the form action', async () => {
			const { store } = createTestStore({ title: '', profile: { name: '' } });
			const { form, host } = await mountInputs(store);
			const nativeForm = host.querySelector('form') as HTMLFormElement;
			const submit = vi.spyOn(nativeForm, 'submit').mockImplementation(() => {});
			let submitNatively: () => void = () => {};
			form.submitHandler = (context) => {
				submitNatively = context.submitNatively;
			};

			nativeForm.requestSubmit();
			await settle();
			submitNatively();
			expect(submit).not.toHaveBeenCalled();

			form.setAttribute('action', '/save');
			submitNatively();
			expect(submit).toHaveBeenCalledTimes(1);
		});

		it('reports a rejecting handler without an unhandled rejection', async () => {
			const boom = new Error('host');
			const errors = vi.fn();
			const unhandled = vi.fn();
			const onError = (event: ErrorEvent) => {
				event.preventDefault();
				errors(event.error);
			};
			const onRejection = (event: PromiseRejectionEvent) => {
				event.preventDefault();
				unhandled(event.reason);
			};
			window.addEventListener('error', onError);
			window.addEventListener('unhandledrejection', onRejection);
			cleanup.push(() => {
				window.removeEventListener('error', onError);
				window.removeEventListener('unhandledrejection', onRejection);
			});
			const { store } = createTestStore({ title: '', profile: { name: '' } });
			const { form, host } = await mountInputs(store);
			form.submitHandler = () => Promise.reject(boom);

			host.querySelector('form')?.requestSubmit();
			await settle();

			expect(errors).toHaveBeenCalledWith(boom);
			expect(unhandled).not.toHaveBeenCalled();
		});

		it('keeps the own validate-then-emit path when no handler is set', async () => {
			const { store } = createTestStore({ title: 'Ready', profile: { name: '' } });
			const validate = vi.spyOn(store, 'validate');
			const { form, host } = await mountInputs(store);
			const onSubmit = vi.fn();
			form.addEventListener('rui-submit', onSubmit);

			host.querySelector('form')?.requestSubmit();
			await settle();

			expect(validate).toHaveBeenCalledWith(undefined, { native: expect.any(Object) });
			expect(onSubmit).toHaveBeenCalledTimes(1);
		});
	});

	it('keeps the baseline a synchronous store normalisation set', async () => {
		const { store } = createTestStore({ title: '', profile: { name: '' } });
		const original = store.setValue.bind(store);
		store.setValue = (path, value) => {
			original(path, typeof value === 'string' ? value.trim() : value);
		};
		const setValue = vi.spyOn(store, 'setValue');
		const { title, host } = await mountInputs(store);
		type(title, ' Ada ');
		await settle();
		setValue.mockClear();

		host.querySelector('form')?.requestSubmit();
		await settle();

		expect(setValue).not.toHaveBeenCalled();
	});

	describe('a store that owns display timing', () => {
		async function mountRequired(store: FormStateStore) {
			const host = document.createElement('div');
			document.body.append(host);
			const root = createRoot(host);
			root.render(
				<RuiForm store={store}>
					<RuiField name="title">
						<RuiInput />
						<RuiFieldError />
					</RuiField>
					<RuiField name="email">
						<RuiInput type="email" required />
						<RuiFieldError />
					</RuiField>
				</RuiForm>,
			);
			cleanup.push(() => {
				root.unmount();
				host.remove();
			});
			await customElements.whenDefined('rui-field');
			await flushRender();
			const [titleField, emailField] = Array.from(host.querySelectorAll('rui-field')) as HTMLElement[];
			return {
				host,
				title: findFieldControl(titleField) as HTMLInputElement,
				email: findFieldControl(emailField) as HTMLInputElement,
				titleField,
				emailField,
			};
		}

		it('keeps an untouched required control native problem hidden while another field changes', async () => {
			const { store, facts } = createTestStore({ title: '', email: '' }, { display: 'validated' });
			const { title, emailField } = await mountRequired(store);

			type(title, 'hello');
			await settle();

			expect(facts().email).toBeUndefined();
			expect(store.getSnapshot().errors.email).toBeUndefined();
			expect(findFieldError(emailField)?.hidden).toBe(true);
		});

		it('shows a native required problem after submit and a type mismatch once typed', async () => {
			const { store } = createTestStore({ title: '', email: '' }, { display: 'validated' });
			const { host, email, emailField } = await mountRequired(store);

			host.querySelector('form')?.requestSubmit();
			await settle();
			expect(store.getSnapshot().errors.email?.type).toBe('valueMissing');
			expect(findFieldError(emailField)?.textContent).toBeTruthy();

			type(email, 'x');
			host.querySelector('form')?.requestSubmit();
			await settle();
			expect(store.getSnapshot().errors.email?.type).toBe('typeMismatch');
		});

		it('turns a user change into one store notification', async () => {
			const { store, notifications } = createTestStore({ title: '', email: '' });
			const { title } = await mountRequired(store);
			await settle();
			const before = notifications();

			type(title, 'a');
			await settle();

			expect(notifications() - before).toBe(1);
		});

		it('tolerates extra fields on errors and keys without a control', async () => {
			const { store } = createTestStore({ title: '', email: '' });
			const taken = { type: 'server', message: 'Taken', source: 'server', all: [{ message: 'Taken' }] };
			store.setHostErrors({ title: taken, __root__: { type: 'form', message: 'The form failed' } });
			const { host, titleField } = await mountRequired(store);
			await settle();

			expect(findFieldError(titleField)?.textContent).toBe('Taken');
			const form = host.querySelector('rui-form') as Element;
			const context = (
				form as unknown as { formProvider: { getContext(): FormContextValue } }
			).formProvider.getContext();
			expect(Object.keys(context.fields).sort()).toEqual(['email', 'title']);
			expect(context.errors.title).toBe(store.getSnapshot().errors.title);
		});
	});

	describe('resetHandler', () => {
		it('hands the native reset to the host instead of resetting the store', async () => {
			const { store } = createTestStore({ title: 'Initial', profile: { name: '' } });
			const reset = vi.spyOn(store, 'reset');
			const { form, title, host } = await mountInputs(store);
			const handler = vi.fn(({ store: given }: { store: FormStateStore }) => {
				given.setValue('title', 'From host');
			});
			form.resetHandler = handler;
			type(title, 'Typed');
			await settle();

			host.querySelector('form')?.reset();
			await settle();

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0]?.[0].store).toBe(store);
			expect(reset).not.toHaveBeenCalled();
			expect(title.value).toBe('From host');
		});

		it('rewrites controls from the store after the browser reset even when the handler is async', async () => {
			const { store } = createTestStore({ title: 'Initial', profile: { name: '' } });
			const { form, title, host } = await mountInputs(store);
			form.resetHandler = async ({ store: given }) => {
				await Promise.resolve();
				given.setValue('title', 'Later');
			};

			host.querySelector('form')?.reset();
			await settle();

			expect(title.value).toBe('Later');
		});

		it('reports a rejecting handler without an unhandled rejection', async () => {
			const boom = new Error('reset');
			const errors = vi.fn();
			const unhandled = vi.fn();
			const onError = (event: ErrorEvent) => {
				event.preventDefault();
				errors(event.error);
			};
			const onRejection = (event: PromiseRejectionEvent) => {
				event.preventDefault();
				unhandled(event.reason);
			};
			window.addEventListener('error', onError);
			window.addEventListener('unhandledrejection', onRejection);
			cleanup.push(() => {
				window.removeEventListener('error', onError);
				window.removeEventListener('unhandledrejection', onRejection);
			});
			const { store } = createTestStore({ title: 'Initial', profile: { name: '' } });
			const { form, host } = await mountInputs(store);
			form.resetHandler = () => Promise.reject(boom);

			host.querySelector('form')?.reset();
			await settle();

			expect(errors).toHaveBeenCalledWith(boom);
			expect(unhandled).not.toHaveBeenCalled();
		});

		it('keeps resetting the store itself when no handler is set', async () => {
			const { store } = createTestStore({ title: 'Initial', profile: { name: '' } });
			const reset = vi.spyOn(store, 'reset');
			const { host } = await mountInputs(store);

			host.querySelector('form')?.reset();
			await settle();

			expect(reset).toHaveBeenCalledTimes(1);
		});
	});

	describe('submitHandler focus on composite controls', () => {
		it('focuses the interactive element inside a composite control', async () => {
			const { store } = createTestStore({ agree: false });
			const host = document.createElement('div');
			document.body.append(host);
			const root = createRoot(host);
			root.render(
				<RuiForm store={store}>
					<RuiField name="agree">
						<RuiCheckbox />
					</RuiField>
				</RuiForm>,
			);
			cleanup.push(() => {
				root.unmount();
				host.remove();
			});
			await customElements.whenDefined('rui-field');
			await flushRender();
			const form = host.querySelector('rui-form') as RuiFormElement;
			let focus: (path: string) => void = () => {};
			form.submitHandler = (context) => {
				focus = context.focus;
			};
			host.querySelector('form')?.requestSubmit();
			await settle();

			focus('agree');

			expect(document.activeElement).toBe(host.querySelector('input[type="checkbox"]'));
		});

		it('focuses an enabled option inside a checkbox group', async () => {
			const { store } = createTestStore({ topics: [] });
			const host = document.createElement('div');
			document.body.append(host);
			const root = createRoot(host);
			root.render(
				<RuiForm store={store}>
					<RuiField name="topics">
						<RuiCheckboxGroup>
							<RuiCheckboxGroupControl>
								<RuiCheckbox value="a" disabled />
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
			await customElements.whenDefined('rui-field');
			await flushRender();
			const form = host.querySelector('rui-form') as RuiFormElement;
			let focus: (path: string) => void = () => {};
			form.submitHandler = (context) => {
				focus = context.focus;
			};
			host.querySelector('form')?.requestSubmit();
			await settle();

			focus('topics');

			expect(document.activeElement).toBe(host.querySelector('input[type="checkbox"]:not([disabled])'));
		});
	});

	describe('submitHandler focus', () => {
		it('focuses the control registered for a path and ignores an unknown path', async () => {
			const { store } = createTestStore({ title: '', profile: { name: '' } });
			const { form, name, host } = await mountInputs(store);
			let focus: (path: string) => void = () => {};
			form.submitHandler = (context) => {
				focus = context.focus;
			};

			host.querySelector('form')?.requestSubmit();
			await settle();
			focus('profile.name');
			expect(document.activeElement).toBe(name);

			expect(() => focus('nope')).not.toThrow();
			expect(document.activeElement).toBe(name);
		});
	});

	describe('native facts travel with the call they describe', () => {
		async function mountEmail(store: FormStateStore, extra: { formatError?: RuiFormFormatError } = {}) {
			const host = document.createElement('div');
			document.body.append(host);
			const root = createRoot(host);
			root.render(
				<RuiForm store={store} formatError={extra.formatError}>
					<RuiField name="email">
						<RuiInput type="email" required />
						<RuiFieldError />
						<RuiFieldWarning />
					</RuiField>
					<RuiField name="extra">
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
			const [emailField, extraField] = Array.from(host.querySelectorAll('rui-field')) as HTMLElement[];
			return {
				host,
				emailField,
				email: findFieldControl(emailField) as HTMLInputElement,
				extraField,
				form: host.querySelector('rui-form') as RuiFormElement,
			};
		}

		it('sends the value and its fact in one call and one notification', async () => {
			const { store, calls, notifications } = createTestStore({ email: '', extra: '' });
			const { email } = await mountEmail(store);
			await settle();
			const before = notifications();
			calls.length = 0;

			type(email, 'x');
			await settle();

			expect(notifications() - before).toBe(1);
			expect(calls).toHaveLength(1);
			expect(calls[0]).toMatchObject({
				kind: 'setValue',
				path: 'email',
				native: { type: 'typeMismatch', params: { inputType: 'email' } },
			});
		});

		it('sends null when the control reports valid', async () => {
			const { store, calls } = createTestStore({ email: '', extra: '' });
			const { email } = await mountEmail(store);
			await settle();
			calls.length = 0;

			type(email, 'a@b.co');
			await settle();

			expect(calls[0]).toMatchObject({ kind: 'setValue', native: null });
		});

		it('hands every control fact to validate on submit, null for a valid one', async () => {
			const { store, calls } = createTestStore({ email: '', extra: '' });
			const { host } = await mountEmail(store);
			calls.length = 0;

			host.querySelector('form')?.requestSubmit();
			await settle();

			const validate = calls.find((call) => call.kind === 'validate');
			expect(validate?.native).toEqual({
				email: { type: 'valueMissing', params: undefined, message: expect.any(String) },
				extra: null,
			});
		});

		it('carries the fact with blur', async () => {
			const { store, calls } = createTestStore({ email: '', extra: '' });
			const { email } = await mountEmail(store);
			calls.length = 0;

			email.focus();
			email.blur();
			await settle();

			expect(calls.find((call) => call.kind === 'blur')).toMatchObject({
				path: 'email',
				native: { type: 'valueMissing' },
			});
		});

		it('releases the fact of a control that is removed or moved', async () => {
			const { store, calls } = createTestStore({ email: '', extra: '' });
			const { extraField, emailField } = await mountEmail(store);
			calls.length = 0;

			extraField.remove();
			await settle();
			expect(calls).toContainEqual({ kind: 'releaseNative', path: 'extra' });

			(emailField as HTMLElement & { name: string }).name = 'moved';
			await settle();
			expect(calls).toContainEqual({ kind: 'releaseNative', path: 'email' });
		});

		it('presents a warning without invalidating the field or blocking submit', async () => {
			const { store } = createTestStore(
				{ email: 'a@b.co', extra: '' },
				{ warn: () => ({ email: { type: 'disposable', message: 'Consider a work address' } }) },
			);
			const { host, emailField, form } = await mountEmail(store);
			const onSubmit = vi.fn();
			form.addEventListener('rui-submit', onSubmit);
			await settle();

			const warning = emailField.querySelector('[data-rui-field-warning]') as HTMLElement;
			expect(warning.textContent).toBe('Consider a work address');
			expect(warning.hidden).toBe(false);
			expect(warning.getAttribute('role')).toBe('status');
			expect(findFieldControl(emailField)?.getAttribute('aria-invalid')).not.toBe('true');

			host.querySelector('form')?.requestSubmit();
			await settle();
			expect(onSubmit).toHaveBeenCalledTimes(1);
		});

		it('refreshes presentation when formatError changes', async () => {
			const { store } = createTestStore({ email: 'a@b.co', extra: '' });
			const { emailField, form } = await mountEmail(store, { formatError: () => 'one' });
			store.setHostErrors({ email: { type: 'x' } });
			await settle();
			expect(findFieldError(emailField)?.textContent).toBe('one');

			form.formatError = () => 'two';
			await settle();

			expect(findFieldError(emailField)?.textContent).toBe('two');
		});

		it('uses formatError for an issue without a message and falls back to the message', async () => {
			const { store } = createTestStore({ email: 'a@b.co', extra: '' });
			const formatError = vi.fn((issue: { type: string; params?: Record<string, unknown> }) =>
				issue.type === 'min' ? `Enter at least ${issue.params?.min}` : '',
			);
			const { emailField } = await mountEmail(store, { formatError });
			store.setHostErrors({ email: { type: 'min', params: { min: 3 } } });
			await settle();

			expect(findFieldError(emailField)?.textContent).toBe('Enter at least 3');
			expect(formatError).toHaveBeenCalledWith(expect.objectContaining({ type: 'min', params: { min: 3 } }));

			store.setHostErrors({ email: { type: 'other', message: 'Plain message' } });
			await settle();
			expect(findFieldError(emailField)?.textContent).toBe('Plain message');
		});
	});
});
