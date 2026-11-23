import { describe, expect, it, vi } from 'vitest';
import type { FormDriver } from './form-driver';
import type { FormStateStoreSnapshot, FormStateStore } from './form-state-store';
import { FormStore } from './form-store';
import { InjectedFormDriver } from './injected-form-driver';
import { OwnFormDriver } from './own-form-driver';
import type { FieldRegistration } from './types';
import { getPath, setPath } from './value-path';

function control(name: string, initial: unknown, validity?: ReturnType<NonNullable<FieldRegistration['getValidity']>>) {
	let value = initial;
	return {
		element: document.createElement('div'),
		name,
		getValidity: () => validity,
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
	let snapshot: FormStateStoreSnapshot = { values, errors: {}, warnings: {} };
	const listeners = new Set<() => void>();
	const store: FormStateStore = {
		getValue: (path) => getPath(values, path),
		setValue: vi.fn((path: string, value: unknown) => {
			values = setPath(values, path, value);
			snapshot = { values, errors: snapshot.errors, warnings: {} };
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
		reportNative() {},
	};
	return store;
}

type Harness = { driver: FormDriver; read(): Record<string, unknown>; changed(name: string): Promise<void> };

const drivers: Array<[string, () => Harness]> = [
	[
		'built-in store',
		() => {
			const store = new FormStore({ defaultValues: { c: [{ e: 'A' }, { e: 'B' }] } });
			return {
				driver: new OwnFormDriver(store),
				read: () => store.getValues(),
				changed: (name) => store.handleFieldChange(name),
			};
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

describe('InjectedFormDriver fact reports', () => {
	it('sends one report with the renamed control at its new path and a withdrawal for each path left', async () => {
		const state = createHostStore({ a: 'x', b: 'y' });
		const reportNative = vi.spyOn(state, 'reportNative');
		const driver = new InjectedFormDriver(state);
		driver.subscribe(() => {});
		const moved = driver.register(control('a', ''));
		const removed = driver.register(control('b', ''));
		await Promise.resolve();
		reportNative.mockClear();

		state.setValue('a', 'x2');
		state.setValue('b', 'y2');
		moved.rename('c');
		removed.unregister();
		await Promise.resolve();

		expect(reportNative.mock.calls).toEqual([[{ a: null, b: null, c: null }]]);
	});

	it('keeps the fact at a path another live control took when rows move', async () => {
		const state = createHostStore({ a: 'x', b: 'y' });
		const reportNative = vi.spyOn(state, 'reportNative');
		const driver = new InjectedFormDriver(state);
		driver.subscribe(() => {});
		const first = driver.register(control('a', '', { valid: false, type: 'valueMissing' }));
		const second = driver.register(control('b', '', { valid: false, type: 'tooShort' }));
		await Promise.resolve();
		reportNative.mockClear();

		first.rename('b');
		second.rename('a');
		await Promise.resolve();

		expect(reportNative.mock.calls).toEqual([[{ b: { type: 'valueMissing' }, a: { type: 'tooShort' } }]]);
	});

	it('withdraws a path nobody holds after the move settles', async () => {
		const state = createHostStore({ a: 'x' });
		const reportNative = vi.spyOn(state, 'reportNative');
		const driver = new InjectedFormDriver(state);
		driver.subscribe(() => {});
		const handle = driver.register(control('a', ''));
		await Promise.resolve();
		reportNative.mockClear();

		handle.unregister();
		await Promise.resolve();

		expect(reportNative.mock.calls).toEqual([[{ a: null }]]);
	});

	it('delivers a withdrawal in the same flush as a control whose validity read throws', async () => {
		const state = createHostStore({ a: 'x', b: 'y' });
		const reportNative = vi.spyOn(state, 'reportNative');
		const reportError = vi.spyOn(globalThis, 'reportError').mockImplementation(() => {});
		const driver = new InjectedFormDriver(state);
		driver.subscribe(() => {});
		const broken = control('a', '');
		broken.getValidity = () => {
			throw new Error('validity broke');
		};
		driver.register(broken);
		const removed = driver.register(control('b', ''));
		await Promise.resolve();
		reportNative.mockClear();
		reportError.mockClear();

		state.setValue('a', 'x2');
		removed.unregister();
		await Promise.resolve();

		expect(reportNative.mock.calls).toEqual([[{ b: null }]]);
		expect(reportError).toHaveBeenCalledTimes(1);
		reportError.mockRestore();
	});

	it('reports the other facts on sync when one control validity read throws', async () => {
		const state = createHostStore({ a: 'x', b: 'y' });
		const reportNative = vi.spyOn(state, 'reportNative');
		const reportError = vi.spyOn(globalThis, 'reportError').mockImplementation(() => {});
		const driver = new InjectedFormDriver(state);
		driver.subscribe(() => {});
		const broken = control('a', '');
		broken.getValidity = () => {
			throw new Error('validity broke');
		};
		driver.register(broken);
		driver.register(control('b', '', { valid: false, type: 'valueMissing' }));
		await Promise.resolve();
		reportNative.mockClear();
		reportError.mockClear();

		driver.sync();

		expect(reportNative.mock.calls).toEqual([[{ b: { type: 'valueMissing' } }]]);
		expect(reportError).toHaveBeenCalledTimes(1);
		reportError.mockRestore();
	});

	it('reports nothing and sends the error to reportError when the validity read throws on an unchanged change', async () => {
		const state = createHostStore({ a: 'x' });
		const reportNative = vi.spyOn(state, 'reportNative');
		const reportError = vi.spyOn(globalThis, 'reportError').mockImplementation(() => {});
		const driver = new InjectedFormDriver(state);
		driver.subscribe(() => {});
		const field = control('a', 'x');
		driver.register(field);
		await Promise.resolve();
		await driver.handleFieldChange('a');
		field.getValidity = () => {
			throw new Error('validity broke');
		};
		reportNative.mockClear();
		reportError.mockClear();

		await expect(driver.handleFieldChange('a')).resolves.toBeUndefined();

		expect(reportNative).not.toHaveBeenCalled();
		expect(reportError).toHaveBeenCalledTimes(1);
		reportError.mockRestore();
	});

	it('writes once and reports at most once for an input then change on one control', async () => {
		const state = createHostStore({ a: false });
		const reportNative = vi.spyOn(state, 'reportNative');
		const driver = new InjectedFormDriver(state);
		driver.subscribe(() => {});
		const field = control('a', false, { valid: false, type: 'valueMissing' });
		driver.register(field);
		await Promise.resolve();
		reportNative.mockClear();

		field.type(true);
		await driver.handleFieldChange('a');
		await driver.handleFieldChange('a');
		await Promise.resolve();

		expect(state.setValue).toHaveBeenCalledTimes(1);
		expect(reportNative).toHaveBeenCalledTimes(1);
	});
});
