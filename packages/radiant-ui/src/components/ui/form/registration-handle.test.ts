import { describe, expect, it, vi } from 'vitest';
import type { FormDriver } from './form-driver';
import type { FormStateStoreSnapshot, FormStateStore } from './form-state-store';
import { FormStore } from './form-store';
import { InjectedFormDriver } from './injected-form-driver';
import type { FieldRegistration } from './types';
import { getPath, setPath } from './value-path';

function control(name: string, initial: unknown) {
	let value = initial;
	return {
		name,
		getValue: () => value,
		setValue: vi.fn((next: unknown) => {
			value = next;
		}),
		type(next: unknown) {
			value = next;
		},
	} satisfies FieldRegistration & { type(next: unknown): void };
}

function createHostStore(initial: Record<string, unknown>) {
	let values = initial;
	let snapshot: FormStateStoreSnapshot = { values, errors: {} };
	const listeners = new Set<() => void>();
	const store: FormStateStore = {
		getValue: (path) => getPath(values, path),
		setValue: vi.fn((path: string, value: unknown) => {
			values = setPath(values, path, value);
			snapshot = { values, errors: snapshot.errors };
			for (const listener of [...listeners]) listener();
		}),
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
		setNativeValidity() {},
	};
	return store;
}

type Harness = { driver: FormDriver; read(): Record<string, unknown>; changed(name: string): Promise<void> };

const drivers: Array<[string, () => Harness]> = [
	[
		'built-in store',
		() => {
			const store = new FormStore({ defaultValues: { c: [{ e: 'A' }, { e: 'B' }] } });
			return { driver: store, read: () => store.getValues(), changed: (name) => store.handleFieldChange(name) };
		},
	],
	[
		'injected store',
		() => {
			const state = createHostStore({ c: [{ e: 'A' }, { e: 'B' }] });
			const driver = new InjectedFormDriver(state);
			driver.subscribe(() => {});
			return {
				driver,
				read: () => state.getSnapshot().values as Record<string, unknown>,
				changed: (name) => driver.handleFieldChange(name),
			};
		},
	],
];

describe.each(drivers)('registration handle (%s)', (_label, makeHarness) => {
	it('keeps both registrations when two keyed rows swap names', async () => {
		const { driver, read, changed } = makeHarness();
		const first = control('c.0.e', 'A');
		const second = control('c.1.e', 'B');
		const firstHandle = driver.register(first);
		const secondHandle = driver.register(second);

		firstHandle.rename('c.1.e');
		secondHandle.rename('c.0.e');

		expect([...driver.getRegisteredFieldNames()].sort()).toEqual(['c.0.e', 'c.1.e']);
		first.type('A2');
		await changed('c.1.e');
		second.type('B2');
		await changed('c.0.e');
		expect(read()).toEqual({ c: [{ e: 'B2' }, { e: 'A2' }] });
	});

	it('moves a registration to a free name and drops the old one', () => {
		const { driver } = makeHarness();
		const handle = driver.register(control('c.0.e', 'A'));

		handle.rename('c.5.e');

		expect(driver.getRegisteredFieldNames()).toEqual(['c.5.e']);
	});

	it('follows chained renames and unregisters the registration it names', () => {
		const { driver } = makeHarness();
		const other = control('keep', '');
		driver.register(other);
		const handle = driver.register(control('a', ''));

		handle.rename('b');
		handle.rename('c');
		expect([...driver.getRegisteredFieldNames()].sort()).toEqual(['c', 'keep']);

		handle.unregister();
		expect(driver.getRegisteredFieldNames()).toEqual(['keep']);
	});

	it('does not let a stale unregister remove a newer registration under the same name', () => {
		const { driver } = makeHarness();
		const old = driver.register(control('a', ''));
		old.rename('b');
		const newer = driver.register(control('a', ''));

		old.unregister();

		expect(driver.getRegisteredFieldNames()).toEqual(['a']);
		newer.unregister();
		expect(driver.getRegisteredFieldNames()).toEqual([]);
	});
});

describe('FormStore rename keeps field state with the control', () => {
	it('carries values, touched and dirty state through a swap', () => {
		const store = new FormStore({ defaultValues: { c: [{ e: 'A' }, { e: 'B' }] } });
		const first = store.register(control('c.0.e', 'A'));
		const second = store.register(control('c.1.e', 'B'));
		store.markTouched('c.0.e');
		store.markDirty('c.1.e');

		first.rename('c.1.e');
		second.rename('c.0.e');

		expect(store.touched).toEqual({ 'c.1.e': true });
		expect(store.dirty).toEqual({ 'c.0.e': true });
		expect(store.getSnapshot().values).toEqual({ c: [{ e: 'B' }, { e: 'A' }] });
	});

	it('notifies once per rename and never reports the field missing', () => {
		const store = new FormStore();
		const handle = store.register(control('a', 'v'));
		const seen: string[][] = [];
		store.subscribe(() => seen.push(store.getRegisteredFieldNames()));

		handle.rename('b');

		expect(seen).toEqual([['b']]);
	});
});

describe('InjectedFormDriver rename', () => {
	it('seeds the control from the store at the new path, even when it holds nothing, and never writes', () => {
		const state = createHostStore({ old: 'kept' });
		const driver = new InjectedFormDriver(state);
		driver.subscribe(() => {});
		const field = control('old', undefined);
		const handle = driver.register(field);
		expect(field.setValue).toHaveBeenLastCalledWith('kept');
		const writes = vi.mocked(state.setValue).mock.calls.length;

		handle.rename('new');

		expect(field.setValue).toHaveBeenLastCalledWith(undefined);
		expect(vi.mocked(state.setValue).mock.calls.length).toBe(writes);
	});
});
