import { describe, expect, test, vi } from 'vitest';
import { Computed, State, createStore, effect, snapshot, untrack, watch } from '../index';

describe('signals', () => {
	test('state exposes current value and notifies subscribers on change', () => {
		const count = new State(1);
		const notify = vi.fn();
		const unsubscribe = count.subscribe(notify);

		count.set(2);
		count.set(2);
		unsubscribe();
		count.set(3);

		expect(count.get()).toBe(3);
		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith(2);
	});

	test('computed tracks dependencies lazily and caches until a source changes', () => {
		const count = new State(2);
		const double = new Computed(() => count.get() * 2);

		expect(double.get()).toBe(4);
		expect(double.get()).toBe(4);

		count.set(3);

		expect(double.get()).toBe(6);
	});

	test('computed subscribers are only notified when the derived value changes', () => {
		const count = new State(0);
		const parity = new Computed(() => ((count.get() & 1) === 0 ? 'even' : 'odd'));
		const notify = vi.fn();
		parity.subscribe(notify);

		expect(parity.get()).toBe('even');
		count.set(2);
		count.set(3);

		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith('odd');
	});

	test('nested computed signals refresh through chained dependencies', () => {
		const count = new State(1);
		const doubled = new Computed(() => count.get() * 2);
		const label = new Computed(() => `value:${doubled.get()}`);

		expect(label.get()).toBe('value:2');
		count.update((value) => value + 2);
		expect(label.get()).toBe('value:6');
	});

	test('untrack excludes reads from computed dependencies', () => {
		const primary = new State(1);
		const secondary = new State(10);
		const total = new Computed(() => primary.get() + untrack(() => secondary.get()));

		expect(total.get()).toBe(11);
		secondary.set(20);
		expect(total.get()).toBe(11);
		primary.set(2);
		expect(total.get()).toBe(22);
	});

	test('effect reruns once through the scheduler and cleans up before the next run', async () => {
		const count = new State(1);
		const events: string[] = [];
		const dispose = effect(() => {
			const value = count.get();
			events.push(`run:${value}`);

			return () => {
				events.push(`cleanup:${value}`);
			};
		});

		count.set(2);
		count.set(3);
		await Promise.resolve();
		dispose();

		expect(events).toEqual(['run:1', 'cleanup:1', 'run:3', 'cleanup:3']);
	});

	test('deep store tracks nested property reads and branch replacement', () => {
		const store = createStore({
			profile: {
				name: 'Ada',
				stats: {
					visits: 2,
				},
			},
		});
		const summary = new Computed(() => `${store.profile.name}:${store.profile.stats.visits}`);

		expect(summary.get()).toBe('Ada:2');
		store.profile.stats.visits = 3;
		expect(summary.get()).toBe('Ada:3');
		store.profile = {
			name: 'Grace',
			stats: {
				visits: 9,
			},
		};
		expect(summary.get()).toBe('Grace:9');
	});

	test('deep store tracks array length and keyed access', () => {
		const store = createStore({ items: ['alpha'] });
		const summary = new Computed(() => `${store.items.length}:${store.items[0] ?? 'empty'}`);

		expect(summary.get()).toBe('1:alpha');
		store.items.push('beta');
		expect(summary.get()).toBe('2:alpha');
		store.items[0] = 'omega';
		expect(summary.get()).toBe('2:omega');
	});

	test('snapshot materializes plain nested data from a store', () => {
		const store = createStore({
			filters: { published: true },
			items: [{ id: 1, title: 'A' }],
		});

		store.items[0].title = 'Updated';
		const plain = snapshot(store);

		expect(plain).toEqual({
			filters: { published: true },
			items: [{ id: 1, title: 'Updated' }],
		});
		expect(plain).not.toBe(store);
		expect(plain.items).not.toBe(store.items);
	});

	test('deep store invalidates key enumeration when the shape changes', () => {
		const store = createStore({ filters: { published: true } });
		const keys = new Computed(() => Object.keys(store.filters).join(','));

		expect(keys.get()).toBe('published');
		(store.filters as { published: boolean; archived?: boolean }).archived = false;
		expect(keys.get()).toBe('published,archived');
		delete (store.filters as { published: boolean; archived?: boolean }).archived;
		expect(keys.get()).toBe('published');
	});

	test('watch observes derived values and receives the previous value', async () => {
		const store = createStore({ profile: { name: 'Ada' } });
		const notify = vi.fn();
		const dispose = watch(
			() => store.profile.name,
			(nextValue, previousValue) => {
				notify({ nextValue, previousValue });
			},
		);

		store.profile.name = 'Grace';
		await Promise.resolve();
		dispose();

		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith({ nextValue: 'Grace', previousValue: 'Ada' });
	});
});
