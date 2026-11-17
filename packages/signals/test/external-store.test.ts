import { describe, expect, test, vi } from 'vitest';
import { computed, effect, fromExternalStore } from '../index';

type ZustandLike<State extends object> = {
	getState: () => State;
	listenerCount: () => number;
	setState: (partial: Partial<State>) => void;
	subscribe: (listener: () => void) => () => void;
};

type ReduxAction = { payload?: unknown; type: string };

type ReduxLike<State> = {
	dispatch: (action: ReduxAction) => void;
	getState: () => State;
	listenerCount: () => number;
	subscribe: (listener: () => void) => () => void;
};

function createZustandLike<State extends object>(initial: State): ZustandLike<State> {
	let current = initial;
	const listeners = new Set<() => void>();

	return {
		getState: () => current,
		listenerCount: () => listeners.size,
		setState(partial) {
			current = { ...current, ...partial };
			for (const listener of [...listeners]) listener();
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

function createReduxLike<State>(
	reducer: (state: State, action: ReduxAction) => State,
	initial: State,
): ReduxLike<State> {
	let current = initial;
	const listeners = new Set<() => void>();

	return {
		dispatch(action) {
			current = reducer(current, action);
			for (const listener of [...listeners]) listener();
		},
		getState: () => current,
		listenerCount: () => listeners.size,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

async function flushMicrotask(): Promise<void> {
	await Promise.resolve();
}

describe('fromExternalStore', () => {
	test('reads the snapshot without subscribing', () => {
		const store = createZustandLike({ count: 3, label: 'idle' });
		const count = fromExternalStore(store, (state) => state.count);

		expect(count.get()).toBe(3);
		expect(store.listenerCount()).toBe(0);
	});

	test('a Zustand-style store notifies only when the selected slice changes', () => {
		const store = createZustandLike({ count: 1, label: 'idle' });
		const count = fromExternalStore(store, (state) => state.count);
		const notify = vi.fn();
		const unsubscribe = count.subscribe(notify);

		store.setState({ label: 'busy' });
		store.setState({ count: 2 });
		unsubscribe();
		store.setState({ count: 3 });

		expect(count.get()).toBe(3);
		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith(2);
		expect(store.listenerCount()).toBe(0);
	});

	test('a Redux-style store notifies from dispatch through getState', () => {
		const store = createReduxLike(
			(state: { items: string[] }, action) => {
				if (action.type === 'add' && typeof action.payload === 'string') {
					return { items: [...state.items, action.payload] };
				}
				if (action.type === 'rename') {
					return state;
				}
				return state;
			},
			{ items: ['mug'] },
		);
		const size = fromExternalStore(store, (state) => state.items.length);
		const notify = vi.fn();
		size.subscribe(notify);

		store.dispatch({ type: 'rename' });
		store.dispatch({ type: 'add', payload: 'lamp' });

		expect(size.get()).toBe(2);
		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith(2);
	});

	test('uses getServerSnapshot until something subscribes, then the client snapshot', () => {
		let server = 10;
		let client = 20;
		const listeners = new Set<() => void>();
		const count = fromExternalStore(
			{
				getSnapshot: () => client,
				getServerSnapshot: () => server,
				subscribe(listener) {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
			},
			(value) => value,
		);

		expect(count.get()).toBe(10);
		expect(listeners.size).toBe(0);

		const notify = vi.fn();
		const unsubscribe = count.subscribe(notify);

		expect(count.get()).toBe(20);
		expect(notify).toHaveBeenCalledWith(20);
		expect(listeners.size).toBe(1);

		client = 21;
		for (const listener of [...listeners]) listener();

		expect(count.get()).toBe(21);
		unsubscribe();
		server = 99;
		expect(count.get()).toBe(99);
		expect(listeners.size).toBe(0);
	});

	test('an effect takes over from the server snapshot and releases the store', async () => {
		let server = 'ssr';
		let client = 'client';
		const listeners = new Set<() => void>();
		const label = fromExternalStore({
			getSnapshot: () => client,
			getServerSnapshot: () => server,
			subscribe(listener) {
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
		});
		const seen: string[] = [];
		const dispose = effect(() => {
			seen.push(label.get());
		});

		expect(seen).toEqual(['ssr']);
		expect(listeners.size).toBe(1);
		await flushMicrotask();
		expect(seen).toEqual(['ssr', 'client']);

		client = 'live';
		for (const listener of [...listeners]) listener();
		await flushMicrotask();

		expect(seen).toEqual(['ssr', 'client', 'live']);
		dispose();
		expect(listeners.size).toBe(0);
	});

	test('a computed with a subscriber tracks the selected slice', async () => {
		const store = createZustandLike({ count: 2 });
		const count = fromExternalStore(store, (state) => state.count);
		const doubled = computed(() => count.get() * 2);
		const notify = vi.fn();
		doubled.subscribe(notify);

		expect(doubled.get()).toBe(4);
		store.setState({ count: 5 });
		await flushMicrotask();

		expect(doubled.get()).toBe(10);
		expect(notify).toHaveBeenCalledWith(10);
	});

	test('throws when the store has neither getSnapshot nor getState', () => {
		expect(() =>
			fromExternalStore({
				subscribe: () => () => {},
			}),
		).toThrow(/getSnapshot or getState/);
	});
});
