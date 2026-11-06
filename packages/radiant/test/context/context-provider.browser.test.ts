import { describe, expect, test } from 'vitest';
import { ContextProvider } from '../../src/context/context-provider';
import type { ContextHostLike } from '../../src/context/context-host';
import { createContext } from '../../src/context/create-context';

type DeliveryContext = {
	value: number;
};

function createDeliveryProvider() {
	const host = document.createElement('div') as unknown as ContextHostLike;
	const context = createContext<DeliveryContext>(Symbol('context-delivery'));
	const provider = new ContextProvider(host, {
		context,
		initialValue: { value: 1 },
	});

	return { provider };
}

describe('ContextProvider notification', () => {
	test('notifies later subscribers when an earlier subscriber unsubscribes itself', () => {
		const { provider } = createDeliveryProvider();
		const received: string[] = [];

		provider.subscribe({
			callback: (_value, unsubscribe) => {
				received.push('a');
				unsubscribe?.();
			},
		});
		provider.subscribe({
			callback: () => {
				received.push('b');
			},
		});

		provider.setContext({ value: 2 });

		expect(received).toEqual(['a', 'b']);
		expect(provider.subscriptions).toHaveLength(1);
	});

	test('skips a later subscriber that was removed during the same delivery', () => {
		const { provider } = createDeliveryProvider();
		const received: string[] = [];
		let unsubscribeB: (() => void) | undefined;

		provider.subscribe({
			callback: () => {
				received.push('a');
				unsubscribeB?.();
			},
		});
		unsubscribeB = provider.subscribe({
			callback: () => {
				received.push('b');
			},
		});

		provider.setContext({ value: 2 });

		expect(received).toEqual(['a']);
		expect(provider.subscriptions).toHaveLength(1);
	});

	test('does not notify a subscriber added during delivery until the next update', () => {
		const { provider } = createDeliveryProvider();
		const received: string[] = [];
		let addedDuringDelivery = false;

		provider.subscribe({
			callback: () => {
				received.push('a');
				if (addedDuringDelivery) {
					return;
				}

				addedDuringDelivery = true;
				provider.subscribe({
					callback: () => {
						received.push('c');
					},
				});
			},
		});
		provider.subscribe({
			callback: () => {
				received.push('b');
			},
		});

		provider.setContext({ value: 2 });
		expect(received).toEqual(['a', 'b']);

		provider.setContext({ value: 3 });
		expect(received).toEqual(['a', 'b', 'a', 'b', 'c']);
	});
});

describe('ContextProvider initialValue', () => {
	test('gives each provider its own copy of an object initialValue', () => {
		const context = createContext<{ mutations: number }>(Symbol('initial-value-copy'));
		const options = { context, initialValue: { mutations: 0 } };
		const one = new ContextProvider<typeof context>(
			document.createElement('div') as unknown as ContextHostLike,
			options,
		);
		const two = new ContextProvider<typeof context>(
			document.createElement('div') as unknown as ContextHostLike,
			options,
		);

		one.getContext().mutations = 5;

		expect(two.getContext().mutations).toBe(0);
		expect(options.initialValue.mutations).toBe(0);
	});

	test('gives each provider its own copy of an array initialValue', () => {
		const context = createContext<number[]>(Symbol('initial-value-array'));
		const options = { context, initialValue: [1] };
		const one = new ContextProvider<typeof context>(
			document.createElement('div') as unknown as ContextHostLike,
			options,
		);
		const two = new ContextProvider<typeof context>(
			document.createElement('div') as unknown as ContextHostLike,
			options,
		);

		one.getContext().push(2);

		expect(two.getContext()).toEqual([1]);
	});
});

describe('ContextProvider merge', () => {
	test('setContext overwrites a nested object instead of merging it', () => {
		const host = document.createElement('div') as unknown as ContextHostLike;
		const context = createContext<{ user: { name: string; age?: number }; theme: string }>(Symbol('merge-context'));
		const provider = new ContextProvider(host, {
			context,
			initialValue: { user: { name: 'Ada', age: 36 }, theme: 'light' },
		});

		provider.setContext({ user: { name: 'Grace' } });

		expect(provider.getContext()).toEqual({ user: { name: 'Grace' }, theme: 'light' });
	});
});

describe('ContextProvider setContext with a non-object value', () => {
	const hostOf = () => document.createElement('div') as unknown as ContextHostLike;

	test('replaces a string value, notifies subscribers and runs the callback', () => {
		const context = createContext<string>(Symbol('set-string'));
		const provider = new ContextProvider<typeof context>(hostOf(), { context, initialValue: 'light' });
		const seen: string[] = [];
		const selected: string[] = [];
		const called: string[] = [];

		provider.subscribe({ callback: (value) => seen.push(value) });
		provider.subscribe<number>({
			select: (value: string) => value.length,
			callback: (length: number) => selected.push(`len:${length}`),
		});

		provider.setContext('dark', (value) => called.push(value));

		expect(provider.getContext()).toBe('dark');
		expect(seen).toEqual(['dark']);
		expect(called).toEqual(['dark']);
		expect(selected).toEqual(['len:4']);

		provider.setContext('wind');
		expect(selected).toEqual(['len:4']);
	});

	test('replaces number and boolean values', () => {
		const numberContext = createContext<number>(Symbol('set-number'));
		const booleanContext = createContext<boolean>(Symbol('set-boolean'));
		const numberProvider = new ContextProvider(hostOf(), { context: numberContext, initialValue: 1 });
		const booleanProvider = new ContextProvider(hostOf(), { context: booleanContext, initialValue: true });

		numberProvider.setContext(0);
		booleanProvider.setContext(false);

		expect(numberProvider.getContext()).toBe(0);
		expect(booleanProvider.getContext()).toBe(false);
	});

	test('replaces an array value', () => {
		const context = createContext<string[]>(Symbol('set-array'));
		const provider = new ContextProvider<typeof context>(hostOf(), { context, initialValue: ['a'] });
		const seen: string[][] = [];

		provider.subscribe({ callback: (value) => seen.push(value) });
		provider.setContext(['a', 'b']);

		expect(provider.getContext()).toEqual(['a', 'b']);
		expect(seen).toEqual([['a', 'b']]);
	});

	test('replaces an object value with null and back', () => {
		const context = createContext<{ a: number } | null>(Symbol('set-null'));
		const provider = new ContextProvider(hostOf(), { context, initialValue: { a: 1 } as { a: number } | null });

		provider.setContext(null);
		expect(provider.getContext()).toBeNull();

		provider.setContext({ a: 2 });
		expect(provider.getContext()).toEqual({ a: 2 });
	});
});
