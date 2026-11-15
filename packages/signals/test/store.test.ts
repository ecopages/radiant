import { describe, expect, test } from 'vitest';
import { Computed, createStore, effect, isStore, snapshot } from '../index';

describe('store', () => {
	test('tracks a missing key through insertion, deletion and reinsertion', () => {
		const store = createStore<{ value?: number }>({});
		const value = new Computed(() => store.value);
		const seen: Array<number | undefined> = [];
		const unsubscribe = value.subscribe((next) => seen.push(next));

		expect(value.get()).toBeUndefined();
		store.value = 1;
		expect(value.get()).toBe(1);
		delete store.value;
		expect(value.get()).toBeUndefined();
		store.value = 2;
		expect(value.get()).toBe(2);
		expect(seen).toEqual([1, undefined, 2]);
		unsubscribe();
	});

	test('re-runs effects when an absent key is added again', async () => {
		const store = createStore<{ value?: number }>({});
		const seen: Array<number | undefined> = [];
		const dispose = effect(() => {
			seen.push(store.value);
		});
		store.value = 1;
		await Promise.resolve();
		delete store.value;
		await Promise.resolve();
		store.value = 2;
		await Promise.resolve();
		expect(seen).toEqual([undefined, 1, undefined, 2]);
		dispose();
	});

	test('restores an inherited value to subscribers when an own key is deleted', () => {
		const store = createStore({});
		const value = new Computed(() => store.toString);
		const seen: Array<unknown> = [];
		const unsubscribe = value.subscribe((next) => seen.push(next));
		const own = () => 'own';
		store.toString = own;
		delete (store as { toString?: () => string }).toString;
		expect(value.get()).toBe(Object.prototype.toString);
		expect(seen).toEqual([own, Object.prototype.toString]);
		unsubscribe();
	});

	test('tracks nested property reads and branch replacement', () => {
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

	test('tracks array length and keyed access', () => {
		const store = createStore({ items: ['alpha'] });
		const summary = new Computed(() => `${store.items.length}:${store.items[0] ?? 'empty'}`);

		expect(summary.get()).toBe('1:alpha');
		store.items.push('beta');
		expect(summary.get()).toBe('2:alpha');
		store.items[0] = 'omega';
		expect(summary.get()).toBe('2:omega');
	});

	test('supports direct array length assignment and truncates removed entries', () => {
		const store = createStore({ items: ['alpha', 'beta', 'gamma'] });
		const summary = new Computed(() => `${store.items.length}:${store.items[2] ?? 'empty'}`);

		expect(summary.get()).toBe('3:gamma');
		store.items.length = 1;

		expect(summary.get()).toBe('1:empty');
		expect(snapshot(store)).toEqual({ items: ['alpha'] });
	});

	test('rejects invalid array lengths', () => {
		const store = createStore({ items: ['alpha'] });

		expect(() => {
			store.items.length = -1;
		}).toThrow(RangeError);
	});

	test('materializes plain nested data from a store', () => {
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

	test('invalidates key enumeration when the shape changes', () => {
		const store = createStore({ filters: { published: true } });
		const keys = new Computed(() => Object.keys(store.filters).join(','));

		expect(keys.get()).toBe('published');
		(store.filters as { published: boolean; archived?: boolean }).archived = false;
		expect(keys.get()).toBe('published,archived');
		delete (store.filters as { published: boolean; archived?: boolean }).archived;
		expect(keys.get()).toBe('published');
	});

	test('deleting properties removes them from reads and snapshots', () => {
		const store = createStore({ profile: { name: 'Ada', age: 32 } });
		const profile = store.profile as { age?: number; name: string };
		const summary = new Computed(() => `${'age' in profile}:${profile.age ?? 'none'}`);

		expect(summary.get()).toBe('true:32');
		delete profile.age;

		expect(summary.get()).toBe('false:none');
		expect(snapshot(store)).toEqual({ profile: { name: 'Ada' } });
	});

	test('detects store proxies and nested store branches', () => {
		const store = createStore({ profile: { name: 'Ada' } });

		expect(isStore(store)).toBe(true);
		expect(isStore(store.profile)).toBe(true);
		expect(isStore({ profile: { name: 'Ada' } })).toBe(false);
	});

	test('normalizes assigned store branches into detached snapshots', () => {
		const externalProfile = createStore({ name: 'Ada' });
		const store = createStore({ profile: externalProfile });

		expect(store.profile.name).toBe('Ada');

		externalProfile.name = 'Grace';
		expect(externalProfile.name).toBe('Grace');
		expect(store.profile.name).toBe('Ada');

		store.profile.name = 'Lin';
		expect(externalProfile.name).toBe('Grace');
		expect(snapshot(store)).toEqual({ profile: { name: 'Lin' } });
	});
});
