import { state as createState, type WritableSignal } from '@ecopages/signals';
import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { signal } from '../../src/decorators/signal';
import { state } from '../../src/decorators/state';

type Settled = 'resolved' | 'rejected' | 'pending';

function settled(promise: Promise<unknown>): Promise<Settled> {
	return Promise.race([
		promise.then(
			(): Settled => 'resolved',
			(): Settled => 'rejected',
		),
		new Promise<Settled>((resolve) => setTimeout(() => resolve('pending'), 50)),
	]);
}

/** Wraps a signal so tests can count live subscriptions. */
function countSubscriptions<Value>(initialValue: Value) {
	const inner = createState(initialValue);
	let subscriptions = 0;
	const source: WritableSignal<Value> = {
		get: () => inner.get(),
		set: (value) => inner.set(value),
		update: (updater) => inner.update(updater),
		subscribe: (notify) => {
			subscriptions += 1;
			const unsubscribe = inner.subscribe(notify);
			return () => {
				subscriptions -= 1;
				unsubscribe();
			};
		},
	};

	return { source, subscriptions: () => subscriptions };
}

const sharedCount = countSubscriptions(0);

@customElement('update-cycle-shared-source-host')
class SharedSourceHost extends RadiantElement {
	@signal({ source: sharedCount.source }) count!: WritableSignal<number>;
	@state label = 'idle';
	runs: string[][] = [];

	@onUpdated(['count', 'label'])
	onChange(changed: ReadonlySet<string>): void {
		this.runs.push([...changed].sort());
	}
}

@customElement('update-cycle-throwing-host')
class ThrowingHost extends RadiantElement {
	@state value = 0;
	@state other = 0;
	cycles: string[] = [];

	@onUpdated('value')
	onValue(): void {
		if (this.value === 1) {
			throw new Error('boom');
		}
	}

	protected override updated(changed: ReadonlySet<string>): void {
		this.cycles.push([...changed].sort().join(','));
	}
}

@customElement('update-cycle-plain-host')
class PlainHost extends RadiantElement {
	@state label = 'a';
	cycles: string[] = [];

	@onUpdated('label')
	onLabel(): void {
		this.dataset.label = this.label;
	}

	protected override updated(changed: ReadonlySet<string>): void {
		this.cycles.push([...changed].join(','));
	}
}

@customElement('update-cycle-field-initializer-host')
class FieldInitializerHost extends RadiantElement {
	@state count = 1;
	runs = 0;

	@onUpdated('count')
	onCount(): void {
		this.runs += 1;
	}
}

async function mount<T extends HTMLElement & { updateComplete: Promise<void> }>(tagName: string): Promise<T> {
	const host = document.createElement(tagName) as T;
	document.body.append(host);
	await host.updateComplete;
	return host;
}

describe('UpdateCycle', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		sharedCount.source.set(0);
	});

	describe('member observation', () => {
		test('a removed host releases its subscriptions to a shared @signal source', async () => {
			const host = await mount<SharedSourceHost>('update-cycle-shared-source-host');
			expect(sharedCount.subscriptions()).toBeGreaterThan(0);

			host.remove();

			expect(sharedCount.subscriptions()).toBe(0);
		});

		test('a shared source write after removal leaves the detached host idle', async () => {
			const host = await mount<SharedSourceHost>('update-cycle-shared-source-host');
			host.remove();

			sharedCount.source.set(1);

			expect(await settled(host.updateComplete)).toBe('resolved');
		});

		test('reconnect reports members that changed while detached, once', async () => {
			const host = await mount<SharedSourceHost>('update-cycle-shared-source-host');
			host.runs = [];
			host.remove();

			sharedCount.source.set(2);
			sharedCount.source.set(3);
			host.label = 'detached';
			document.body.append(host);
			await host.updateComplete;

			expect(host.runs).toEqual([['count', 'label']]);
		});

		test('a @state initializer is initialization, not a change, in every decorator mode', async () => {
			const host = await mount<FieldInitializerHost>('update-cycle-field-initializer-host');

			expect(host.runs).toBe(0);
			host.count = 2;
			await host.updateComplete;
			expect(host.runs).toBe(1);
		});

		test('reconnect skips members whose value returned to the snapshot', async () => {
			const host = await mount<SharedSourceHost>('update-cycle-shared-source-host');
			host.runs = [];
			host.remove();

			sharedCount.source.set(5);
			sharedCount.source.set(0);
			document.body.append(host);
			await host.updateComplete;

			expect(host.runs).toEqual([]);
		});
	});

	describe('errors', () => {
		test('updateComplete rejects when a scheduled flush throws', async () => {
			const host = await mount<ThrowingHost>('update-cycle-throwing-host');

			host.value = 1;

			expect(await settled(host.updateComplete)).toBe('rejected');
			await expect(Promise.resolve().then(() => host.updateComplete)).resolves.toBeUndefined();
		});

		test('the next cycle does not inherit the failed cycle changes', async () => {
			const host = await mount<ThrowingHost>('update-cycle-throwing-host');
			host.value = 1;
			await settled(host.updateComplete);
			host.cycles = [];

			host.other = 1;
			await host.updateComplete;

			expect(host.cycles).toEqual(['other']);
		});

		test('update() throws a callback error to its caller', async () => {
			const host = await mount<ThrowingHost>('update-cycle-throwing-host');

			host.value = 1;

			expect(() => host.update()).toThrow('boom');
			expect(await settled(host.updateComplete)).toBe('resolved');
		});
	});

	describe('update()', () => {
		test('runs pending @onUpdated and updated() synchronously on a host without render()', async () => {
			const host = await mount<PlainHost>('update-cycle-plain-host');
			host.cycles = [];

			host.label = 'b';
			host.update();

			expect(host.dataset.label).toBe('b');
			expect(host.cycles).toEqual(['label']);
			await host.updateComplete;
			expect(host.cycles).toEqual(['label']);
		});
	});
});
