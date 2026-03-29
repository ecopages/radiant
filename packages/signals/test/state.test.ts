import { describe, expect, test, vi } from 'vitest';
import { State, state, subtle } from '../index';

describe('State', () => {
	test('exposes current value and notifies subscribers on change', () => {
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

	test('notifies multiple subscribers and unsubscribes them independently', () => {
		const count = new State(0);
		const firstNotify = vi.fn();
		const secondNotify = vi.fn();
		const unsubscribeFirst = count.subscribe(firstNotify);
		count.subscribe(secondNotify);

		count.set(1);
		unsubscribeFirst();
		count.set(2);

		expect(firstNotify).toHaveBeenCalledTimes(1);
		expect(firstNotify).toHaveBeenCalledWith(1);
		expect(secondNotify).toHaveBeenCalledTimes(2);
		expect(secondNotify).toHaveBeenNthCalledWith(1, 1);
		expect(secondNotify).toHaveBeenNthCalledWith(2, 2);
	});

	test('factory helper creates a writable state signal', () => {
		const count = state(1);

		count.update((value) => value + 2);

		expect(count).toBeInstanceOf(State);
		expect(count.get()).toBe(3);
	});

	test('watch lifecycle hooks run on the first and last watcher', () => {
		const lifecycleEvents: string[] = [];
		const count = new State(1, {
			[subtle.watched]() {
				lifecycleEvents.push('watched');
			},
			[subtle.unwatched]() {
				lifecycleEvents.push('unwatched');
			},
		});
		const firstWatcher = new subtle.Watcher(() => undefined);
		const secondWatcher = new subtle.Watcher(() => undefined);

		firstWatcher.watch(count);
		secondWatcher.watch(count);
		firstWatcher.unwatch(count);
		secondWatcher.unwatch(count);

		expect(lifecycleEvents).toEqual(['watched', 'unwatched']);
	});

	test('rethrows a single watcher failure after publishing subscribers', () => {
		const count = new State(1);
		const notify = vi.fn();
		const failure = new Error('watcher failed');
		const watcher = new subtle.Watcher(() => {
			throw failure;
		});

		count.subscribe(notify);
		watcher.watch(count);

		expect(() => count.set(2)).toThrow(failure);
		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith(2);
	});

	test('aggregates multiple watcher failures before rethrowing', () => {
		const count = new State(1);
		const notify = vi.fn();
		const firstFailure = new Error('first watcher failed');
		const secondFailure = new Error('second watcher failed');
		const firstWatcher = new subtle.Watcher(() => {
			throw firstFailure;
		});
		const secondWatcher = new subtle.Watcher(() => {
			throw secondFailure;
		});

		count.subscribe(notify);
		firstWatcher.watch(count);
		secondWatcher.watch(count);

		try {
			count.set(2);
			expect.unreachable('Expected multiple watcher failures to be rethrown.');
		} catch (error) {
			expect(error).toBeInstanceOf(AggregateError);
			expect((error as AggregateError).errors).toEqual([firstFailure, secondFailure]);
		}

		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith(2);
	});

	test('equals callbacks receive the state signal as this', () => {
		const contexts: unknown[] = [];
		const count = new State(1, {
			equals(previousValue, nextValue) {
				contexts.push(this);
				return previousValue === nextValue;
			},
		});

		count.set(2);
		count.set(2);

		expect(contexts).toEqual([count, count]);
	});
});