import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { FormContextValue } from './form-context';
import type { FormStateStore } from './form-state-store';
import type { RuiFormInvalidDetail } from './form.script';
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
				getValidity: () => ({ valid: false, type: 'tooShort', message: 'Enter all 6 characters' }),
			});

			expect(await store.validateAll()).toBe(false);
			expect(store.errors.code).toEqual({ type: 'tooShort', message: 'Enter all 6 characters' });
		});

		it('reports an invalid control without inventing a message', async () => {
			const store = new FormStore<{ code: string }>();
			store.register({
				name: 'code',
				getValue: () => 'ab',
				setValue: () => {},
				getValidity: () => ({ valid: false }),
			});

			expect(await store.validateField('code')).toBe(false);
			expect(store.getFieldError('code')).toBeUndefined();
			expect(store.errors.code).toEqual({ type: 'customError', message: undefined });
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
			expect(store.errors.code).toEqual({ type: 'customError', message: 'Too short' });
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
			expectTypeOf<RuiFormInvalidDetail<{ profile: { name: string } }>['errors']['profile.name']>().toEqualTypeOf<
				{ message?: string } | undefined
			>();
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

		it('keeps the snapshot in step with direct assignment to values and errors', () => {
			const store = new FormStore<{ a: string }>();
			const first = store.getSnapshot();

			store.errors = { a: { message: 'x' } };
			expect(store.getSnapshot().errors).toEqual({ a: { message: 'x' } });
			store.values = { a: 'y' };
			expect(store.getSnapshot().values).toEqual({ a: 'y' });
			expect(store.getSnapshot()).not.toBe(first);
		});

		it('blur marks the field touched and validates per mode', async () => {
			const store = new FormStore<{ a: string }>({ mode: 'onBlur' });
			store.register({ name: 'a', rules: { required: 'Req' }, getValue: () => '', setValue: () => {} });

			store.blur('a');
			await vi.waitFor(() => expect(store.getFieldError('a')).toBe('Req'));
			expect(store.touched.a).toBe(true);
		});

		it('reflects a field default seeded at registration in the snapshot', () => {
			const store = new FormStore<{ title: string }>();
			expect(store.getSnapshot().values).toEqual({});

			store.register({ name: 'title', defaultValue: 'Seeded', getValue: () => 'Seeded', setValue: () => {} });

			expect(store.getSnapshot().values).toEqual({ title: 'Seeded' });
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

		it('lets a source message win over a rule message and clears sources on reset', async () => {
			const store = new FormStore<{ a: string }>();
			store.register({ name: 'a', rules: { required: 'Rule' }, getValue: () => '', setValue: () => {} });
			store.setErrors('server', { a: { message: 'Server' } });
			await store.validate(['a']);

			expect(store.getFieldError('a')).toBe('Server');

			store.reset();

			expect(store.getFieldError('a')).toBeUndefined();
		});
	});

	describe('nested values', () => {
		function field(name: string, initial: unknown = undefined, extra: object = {}) {
			let current = initial;
			return {
				name,
				getValue: () => current,
				setValue: vi.fn((next: unknown) => {
					current = next;
				}),
				...extra,
			};
		}

		it('addresses dotted field names as a nested tree', () => {
			const defaults = { profile: { name: 'Ada' }, rows: [{ title: 'T' }] };
			const store = new FormStore({ defaultValues: defaults });
			store.register(field('profile.name'));
			store.register(field('rows.0.title'));

			expect(store.getValues()).toEqual(defaults);
			expect(store.getSnapshot().values).toEqual(defaults);
			expect(store.getValue('profile.name')).toBe('Ada');
		});

		it('writes by path and seeds controls from a nested default tree', () => {
			const store = new FormStore({ defaultValues: { profile: { name: 'Grace', city: 'NYC' } } });
			const name = field('profile.name');
			store.register(name);

			expect(name.setValue).toHaveBeenCalledWith('Grace');

			store.setValue('profile.name', 'Hopper');

			expect(store.getSnapshot().values).toEqual({ profile: { name: 'Hopper', city: 'NYC' } });
			expect(name.setValue).toHaveBeenLastCalledWith('Hopper');
		});

		it('seeds a field default at its path and restores nested defaults on reset', () => {
			const store = new FormStore({ defaultValues: { profile: { city: 'NYC' } } });
			store.register(field('profile.name', undefined, { defaultValue: 'Seeded' }));

			expect(store.getSnapshot().values).toEqual({ profile: { city: 'NYC', name: 'Seeded' } });

			store.setValue('profile.name', 'Changed');
			store.reset();

			expect(store.getSnapshot().values).toEqual({ profile: { city: 'NYC', name: 'Seeded' } });
		});

		it('hands rules and resolvers nested values', async () => {
			const seen: unknown[] = [];
			const store = new FormStore();
			store.register(
				field('profile.name', '', {
					rules: {
						required: 'Name required',
						validate: (_value: unknown, values: unknown) => {
							seen.push(values);
							return true;
						},
					},
				}),
			);

			expect(await store.validate()).toBe(false);
			expect(store.errors['profile.name']?.message).toBe('Name required');

			store.setValue('profile.name', 'Ada');
			expect(await store.validate()).toBe(true);
			expect(seen.at(-1)).toEqual({ profile: { name: 'Ada' } });
		});
	});

	describe('FieldError contract', () => {
		it('treats an entry without a message as an invalid field that shows no text', async () => {
			const store = new FormStore<{ a: string }>();
			store.register({ name: 'a', getValue: () => 'ok', setValue: () => {} });
			store.isSubmitted = true;

			store.setErrors('server', { a: {} });

			expect(await store.validate(['a'])).toBe(false);
			expect(store.getFieldError('a')).toBeUndefined();
			expect(store.shouldDisplayFieldError('a')).toBe(true);
		});

		it('treats an empty message like a missing one', async () => {
			const store = new FormStore<{ a: string }>();
			store.register({ name: 'a', getValue: () => 'ok', setValue: () => {} });

			store.setErrors('server', { a: { message: '' } });

			expect(await store.validate(['a'])).toBe(false);
			expect(store.getFieldError('a')).toBeUndefined();
		});

		it('lets a host source replace its own validation and the later source win', async () => {
			const store = new FormStore<{ a: string }>();
			store.register({
				name: 'a',
				rules: { required: 'Rule' },
				getValue: () => '',
				setValue: () => {},
				getValidity: () => ({ valid: false, message: 'Native' }),
			});
			await store.validate(['a']);
			expect(store.errors.a?.message).toBe('Rule');

			store.setErrors('server', { a: { message: 'Server' } });
			expect(store.errors.a?.message).toBe('Server');

			store.setErrors('audit', { a: { message: 'Audit' } });
			expect(store.errors.a?.message).toBe('Audit');
		});
	});

	describe('paths and ordering', () => {
		function field(name: string, initial: unknown) {
			let current = initial;
			return {
				name,
				getValue: () => current,
				setValue: vi.fn((next: unknown) => {
					current = next;
				}),
			};
		}

		it('rewrites registered descendants when a parent branch is replaced', async () => {
			const store = new FormStore({ defaultValues: { profile: { name: 'Ada' } } });
			const name = field('profile.name', 'Ada');
			store.register(name);

			store.setValue('profile', { name: 'Grace' });

			expect(name.setValue).toHaveBeenLastCalledWith('Grace');
			expect(store.getValue('profile.name')).toBe('Grace');
			expect(store.getValues()).toEqual({ profile: { name: 'Grace' } });
		});

		it('rewrites a registered ancestor when a descendant path is written', () => {
			const store = new FormStore({ defaultValues: { profile: { name: 'Ada' } } });
			const profile = field('profile', { name: 'Ada' });
			store.register(profile);

			store.setValue('profile.name', 'Grace');

			expect(profile.setValue).toHaveBeenLastCalledWith({ name: 'Grace' });
		});

		it('keeps the value when a field is renamed beneath its previous path', () => {
			const store = new FormStore({ defaultValues: { a: 'kept' } });
			const handle = store.register(field('a', 'kept'));

			handle.rename('a.b');

			expect(store.getValues()).toEqual({ a: { b: 'kept' } });
			expect(store.getRegisteredFieldNames()).toEqual(['a.b']);
		});

		it('accepts dotted paths in the typed error, touched and dirty records', () => {
			const store = new FormStore<{ profile: { name: string } }>({
				resolver: async () => ({ values: {}, errors: { 'profile.name': { message: 'bad' } } }),
			});
			store.register(field('profile.name', 'x'));
			store.markTouched('profile.name');
			const touched: boolean | undefined = store.touched['profile.name'];
			const dirty: boolean | undefined = store.dirty['profile.name'];

			expect(touched).toBe(true);
			expect(dirty).toBeUndefined();
		});

		it('lets the source set most recently win among sources of one rank', () => {
			const store = new FormStore<{ a: string }>();
			store.setErrors('server', { a: { message: 'first' } });
			store.setErrors('audit', { a: { message: 'second' } });
			store.setErrors('server', { a: { message: 'updated' } });

			expect(store.errors.a?.message).toBe('updated');
		});
	});

	describe('a value written to the store is a change', () => {
		function field(name: string, initial: unknown = '') {
			let current = initial;
			return {
				name,
				getValue: () => current,
				setValue: (next: unknown) => {
					current = next;
				},
			};
		}

		it('marks the field dirty and validates it per mode', async () => {
			const store = new FormStore<{ a: string }>({ mode: 'onChange' });
			store.register({ ...field('a'), rules: { required: 'Req' } });

			store.setValue('a', '');
			await vi.waitFor(() => expect(store.getFieldError('a')).toBe('Req'));

			expect(store.dirty.a).toBe(true);
		});

		it('clears a host error at the path when the user edits that field', async () => {
			const store = new FormStore<{ a: string; b: string }>();
			store.register(field('a', 'x'));
			store.register(field('b', 'y'));
			store.setErrors('server', { a: { message: 'Taken' }, b: { message: 'Other' } });

			await store.handleFieldChange('a');

			expect(store.errors.a).toBeUndefined();
			expect(store.errors.b?.message).toBe('Other');
			expect(await store.validate(['a'])).toBe(true);
		});

		it('clears a host error at the path when a value is written through setValue', () => {
			const store = new FormStore<{ a: string }>();
			store.register(field('a'));
			store.setErrors('server', { a: { message: 'Taken' } });

			store.setValue('a', 'fixed');

			expect(store.errors.a).toBeUndefined();
		});
	});
});
