import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { FormContextValue } from './form-context';
import type { FormStateStore } from './form-state-store';
import { FormStore } from './form-store';

describe('FormStore', () => {
	it('validates required rules for registered fields', async () => {
		const store = new FormStore({ mode: 'onSubmit', defaultValues: { email: '' } });
		store.register({
			name: 'email',
			rules: { required: 'Email is required' },
			getValue: () => '',
			setValue: () => {},
		});

		store.isSubmitted = true;
		const valid = await store.validateAll();

		expect(valid).toBe(false);
		expect(store.getFieldError('email')).toBe('Email is required');
		expect(store.shouldDisplayFieldError('email')).toBe(true);
	});

	describe('control validity', () => {
		it('adds a native error from an invalid control', async () => {
			const store = new FormStore<{ code: string }>();
			store.register({
				name: 'code',
				getValue: () => 'ab',
				setValue: () => {},
				getValidity: () => ({ valid: false, message: 'Enter all 6 characters' }),
			});

			expect(await store.validateAll()).toBe(false);
			expect(store.errors.code).toEqual({ type: 'native', message: 'Enter all 6 characters' });
		});

		it('falls back to a generic message', async () => {
			const store = new FormStore<{ code: string }>();
			store.register({
				name: 'code',
				getValue: () => 'ab',
				setValue: () => {},
				getValidity: () => ({ valid: false }),
			});

			expect(await store.validateField('code')).toBe(false);
			expect(store.getFieldError('code')).toBe('Invalid value');
		});

		it('lets a rule message win over the control message', async () => {
			const store = new FormStore<{ code: string }>();
			store.register({
				name: 'code',
				rules: { required: 'Code is required' },
				getValue: () => '',
				setValue: () => {},
				getValidity: () => ({ valid: false, message: 'Native message' }),
			});

			await store.validateAll();
			expect(store.errors.code).toEqual({ type: 'validation', message: 'Code is required' });
		});

		it('is not disabled by a custom resolver', async () => {
			const store = new FormStore<{ code: string }>({ resolver: async () => ({ values: {}, errors: {} }) });
			store.register({
				name: 'code',
				getValue: () => 'ab',
				setValue: () => {},
				getValidity: () => ({ valid: false, message: 'Too short' }),
			});

			expect(await store.validateAll()).toBe(false);
			expect(await store.validateField('code')).toBe(false);
			expect(store.getFieldError('code')).toBe('Too short');
		});

		it('uses the control message when the resolver error has none', async () => {
			const store = new FormStore<{ code: string }>({
				resolver: async () => ({ values: {}, errors: { code: { type: 'custom' } } }),
			});
			store.register({
				name: 'code',
				getValue: () => 'ab',
				setValue: () => {},
				getValidity: () => ({ valid: false, message: 'Too short' }),
			});

			expect(await store.validateField('code')).toBe(false);
			expect(store.getFieldError('code')).toBe('Too short');
			expect(await store.validateAll()).toBe(false);
			expect(store.errors.code).toEqual({ type: 'native', message: 'Too short' });
		});

		it('clears the error once the control is valid', async () => {
			const store = new FormStore<{ code: string }>();
			let validity: { valid: boolean; message?: string } = { valid: false, message: 'Too short' };
			store.register({ name: 'code', getValue: () => 'ab', setValue: () => {}, getValidity: () => validity });
			await store.validateAll();
			validity = { valid: true };

			expect(await store.validateField('code')).toBe(true);
			expect(store.getFieldError('code')).toBeUndefined();
		});

		it('ignores a control that reports no validity', async () => {
			const store = new FormStore<{ code: string }>();
			store.register({ name: 'code', getValue: () => 'ab', setValue: () => {}, getValidity: () => undefined });

			expect(await store.validateAll()).toBe(true);
		});
	});

	describe('reset', () => {
		function registerField(store: FormStore<{ qty: number | null }>, defaultValue: unknown) {
			let current: unknown = null;
			const setValue = vi.fn((next: unknown) => {
				current = next;
			});
			store.register({ name: 'qty', getValue: () => current, setValue });
			store.updateFieldOptions('qty', { defaultValue });
			return setValue;
		}

		it('restores the form defaultValues for a field without its own default', () => {
			const store = new FormStore<{ qty: number | null }>({ mode: 'onSubmit', defaultValues: { qty: 1 } });
			const setValue = registerField(store, null);
			store.setValue('qty', 5);

			store.reset();

			expect(store.getValues().qty).toBe(1);
			expect(setValue).toHaveBeenLastCalledWith(1);
		});

		it('lets an explicit field default win over the form defaultValues', () => {
			const store = new FormStore<{ qty: number | null }>({ mode: 'onSubmit', defaultValues: { qty: 1 } });
			registerField(store, 3);
			store.setValue('qty', 5);

			store.reset();

			expect(store.getValues().qty).toBe(3);
		});

		it('stops using a field default that was later removed', () => {
			const store = new FormStore<{ qty: number | null }>({ mode: 'onSubmit', defaultValues: { qty: 1 } });
			const setValue = registerField(store, 3);
			store.updateFieldOptions('qty', { defaultValue: null });
			store.setValue('qty', 5);

			store.reset();

			expect(store.getValues().qty).toBe(1);
			expect(setValue).toHaveBeenLastCalledWith(1);
		});
	});

	describe('register', () => {
		function makeField(name: string) {
			let current: unknown;
			return { name, getValue: () => current, setValue: vi.fn((next: unknown) => (current = next)) };
		}

		it('keeps the form default when the field registers with a null default', () => {
			const store = new FormStore<{ qty: number | null }>({ mode: 'onSubmit', defaultValues: { qty: 1 } });
			const field = makeField('qty');
			store.register({ ...field, defaultValue: null });

			expect(store.getValues().qty).toBe(1);
			expect(field.setValue).toHaveBeenLastCalledWith(1);
		});

		it('does not seed null into the store for a field with no default', () => {
			const store = new FormStore<{ qty: number | null }>({ mode: 'onSubmit' });
			const field = makeField('qty');
			store.register({ ...field, defaultValue: null });

			expect(field.setValue).toHaveBeenLastCalledWith(undefined);
		});

		it('picks up a form default set after the field registered', () => {
			const store = new FormStore<{ qty: number | null }>({ mode: 'onSubmit' });
			const field = makeField('qty');
			store.register({ ...field, defaultValue: null });
			store.updateOptions({ mode: 'onSubmit', defaultValues: { qty: 1 } });
			store.reset();

			expect(store.getValues().qty).toBe(1);
		});
	});

	describe('FormStateStore', () => {
		it('satisfies the interface and is the type of the form context store', () => {
			expectTypeOf<FormStore>().toExtend<FormStateStore>();
			expectTypeOf<FormContextValue['store']>().toEqualTypeOf<FormStateStore | undefined>();
		});

		it('reads values and keeps a snapshot stable until state changes', () => {
			const store = new FormStore({ defaultValues: { title: 'A' } });
			const first = store.getSnapshot();

			expect(store.getValue('title')).toBe('A');
			expect(store.getSnapshot()).toBe(first);

			store.setValue('title', 'B');

			expect(store.getSnapshot()).not.toBe(first);
			expect(store.getSnapshot().values).toEqual({ title: 'B' });
			expect(first.values).toEqual({ title: 'A' });
		});

		it('validates the given paths or everything and reports validity', async () => {
			const store = new FormStore<{ a: string; b: string }>();
			for (const name of ['a', 'b']) {
				store.register({
					name,
					rules: { required: `${name} required` },
					getValue: () => '',
					setValue: () => {},
				});
			}

			expect(await store.validate(['a'])).toBe(false);
			expect(store.getFieldError('a')).toBe('a required');
			expect(store.getFieldError('b')).toBeUndefined();
			expect(await store.validate()).toBe(false);
			expect(store.getFieldError('b')).toBe('b required');
		});

		it('merges source errors, keeps them through validation, and clears them by source', async () => {
			const store = new FormStore<{ a: string }>();
			store.register({ name: 'a', getValue: () => 'ok', setValue: () => {} });
			const listener = vi.fn();
			store.subscribe(listener);

			store.setErrors('server', { a: { type: 'server', message: 'Taken' } });

			expect(listener).toHaveBeenCalledTimes(1);
			expect(store.getFieldError('a')).toBe('Taken');
			expect(await store.validate(['a'])).toBe(false);
			expect(store.getFieldError('a')).toBe('Taken');

			store.setErrors('server', {});

			expect(store.getFieldError('a')).toBeUndefined();
			expect(await store.validate(['a'])).toBe(true);
		});

		it('lets a rule message win over a source error and clears sources on reset', async () => {
			const store = new FormStore<{ a: string }>();
			store.register({ name: 'a', rules: { required: 'Rule' }, getValue: () => '', setValue: () => {} });
			store.setErrors('server', { a: { message: 'Server' } });
			await store.validate(['a']);

			expect(store.getFieldError('a')).toBe('Rule');

			store.reset();

			expect(store.getFieldError('a')).toBeUndefined();
		});
	});
});
