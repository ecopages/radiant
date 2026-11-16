import { describe, expect, test } from 'vitest';
import { Computed, State, subtle } from '../index';

describe('Watcher', () => {
	test('notifies for watched computed signals and tracks pending signals until reset', () => {
		const count = new State(1);
		const doubled = new Computed(() => count.get() * 2);
		const notifications: string[] = [];
		const watcher = new subtle.Watcher(function () {
			notifications.push('notify');
		});

		watcher.watch(doubled);
		count.set(2);
		count.set(3);

		expect(notifications).toEqual(['notify']);
		expect(watcher.getPending()).toEqual([doubled]);

		watcher.watch();
		count.set(4);

		expect(notifications).toEqual(['notify', 'notify']);
		expect(watcher.getPending()).toEqual([doubled]);
	});

	test('collects every invalidated watched signal during the current cycle', () => {
		const first = new State(0);
		const second = new State(0);
		const notifications: string[] = [];
		const watcher = new subtle.Watcher(() => {
			notifications.push('notify');
		});

		watcher.watch(first, second);
		first.set(1);
		second.set(1);

		expect(notifications).toEqual(['notify']);
		expect(watcher.getPending()).toEqual([first, second]);
	});

	test('throws when unwatching a signal that is not currently watched', () => {
		const count = new State(1);
		const watcher = new subtle.Watcher(() => undefined);

		expect(() => watcher.unwatch(count)).toThrow('Signal is not watched by this watcher.');
	});

	test('rejects signals not created by this package', () => {
		const watcher = new subtle.Watcher(() => undefined);
		const foreignSignal = {
			get() {
				return 1;
			},
			subscribe() {
				return () => undefined;
			},
		};

		expect(() => watcher.watch(foreignSignal as never)).toThrow('Expected a signal created by @ecopages/signals.');
	});

	test('notifications freeze signal reads and writes', () => {
		const count = new State(1);
		const watcher = new subtle.Watcher(() => {
			expect(() => count.get()).toThrow('Cannot read or write signals during a Watcher notification.');
			expect(() => count.set(3)).toThrow('Cannot read or write signals during a Watcher notification.');
		});

		watcher.watch(count);
		count.set(2);
	});

	test('watch and unwatch lifecycle hooks run only for the first and last watcher', () => {
		const events: string[] = [];
		const count = new State(1, {
			[subtle.watched]() {
				events.push('watched');
			},
			[subtle.unwatched]() {
				events.push('unwatched');
			},
		});
		const firstWatcher = new subtle.Watcher(() => undefined);
		const secondWatcher = new subtle.Watcher(() => undefined);

		firstWatcher.watch(count);
		secondWatcher.watch(count);
		firstWatcher.unwatch(count);
		secondWatcher.unwatch(count);

		expect(events).toEqual(['watched', 'unwatched']);
	});

	test('re-watching the same signal resets pending state without duplicating subscriptions', () => {
		const events: string[] = [];
		const count = new State(1, {
			[subtle.watched]() {
				events.push('watched');
			},
		});
		const watcher = new subtle.Watcher(() => undefined);

		watcher.watch(count);
		count.set(2);
		expect(watcher.getPending()).toEqual([count]);

		watcher.watch(count);
		expect(watcher.getPending()).toEqual([]);
		expect(events).toEqual(['watched']);
	});

	test('removes computed dependency watchers when the dependency set changes or the computed is unwatched', () => {
		const lifecycleEvents: string[] = [];
		const usePrimary = new State(true, {
			[subtle.watched]() {
				lifecycleEvents.push('usePrimary:watched');
			},
			[subtle.unwatched]() {
				lifecycleEvents.push('usePrimary:unwatched');
			},
		});
		const primary = new State(1, {
			[subtle.watched]() {
				lifecycleEvents.push('primary:watched');
			},
			[subtle.unwatched]() {
				lifecycleEvents.push('primary:unwatched');
			},
		});
		const secondary = new State(10, {
			[subtle.watched]() {
				lifecycleEvents.push('secondary:watched');
			},
			[subtle.unwatched]() {
				lifecycleEvents.push('secondary:unwatched');
			},
		});
		const selected = new Computed(() => (usePrimary.get() ? primary.get() : secondary.get()));
		const watcher = new subtle.Watcher(() => undefined);

		watcher.watch(selected);
		expect(selected.get()).toBe(1);

		usePrimary.set(false);
		expect(selected.get()).toBe(10);
		watcher.unwatch(selected);

		expect(lifecycleEvents).toEqual([
			'usePrimary:watched',
			'primary:watched',
			'primary:unwatched',
			'secondary:watched',
			'usePrimary:unwatched',
			'secondary:unwatched',
		]);
	});

	describe('a throwing watched hook', () => {
		const boom = new Error('watched failed');

		function tracked(name: string, events: string[], throwOnWatch = false) {
			return new State(0, {
				[subtle.watched]() {
					events.push(`${name}:watched`);

					if (throwOnWatch) {
						throw boom;
					}
				},
				[subtle.unwatched]() {
					events.push(`${name}:unwatched`);
				},
			});
		}

		test('rethrows, leaves the watcher unchanged and keeps earlier signals watched', () => {
			const events: string[] = [];
			const first = tracked('first', events);
			const failing = tracked('failing', events, true);
			const watcher = new subtle.Watcher(() => undefined);

			watcher.watch(first);
			expect(() => watcher.watch(failing)).toThrow(boom);
			expect(() => watcher.unwatch(failing)).toThrow('Signal is not watched by this watcher.');

			watcher.unwatch(first);
			expect(events).toEqual(['first:watched', 'failing:watched', 'first:unwatched']);
		});

		test('releases signals watched earlier in the same call, in reverse order', () => {
			const events: string[] = [];
			const first = tracked('first', events);
			const second = tracked('second', events);
			const failing = tracked('failing', events, true);
			const watcher = new subtle.Watcher(() => undefined);

			expect(() => watcher.watch(first, second, failing)).toThrow(boom);
			expect(events).toEqual([
				'first:watched',
				'second:watched',
				'failing:watched',
				'second:unwatched',
				'first:unwatched',
			]);
			expect(() => watcher.unwatch(first)).toThrow('Signal is not watched by this watcher.');
		});

		test('releases the dependencies a computed had already watched', () => {
			const events: string[] = [];
			const shared = tracked('shared', events);
			const failing = tracked('failing', events, true);
			const derived = new Computed(() => shared.get() + failing.get());
			const watcher = new subtle.Watcher(() => undefined);

			expect(() => watcher.watch(derived)).toThrow(boom);
			expect(events).toEqual(['shared:watched', 'failing:watched', 'shared:unwatched']);
			expect(() => watcher.unwatch(derived)).toThrow('Signal is not watched by this watcher.');
		});

		test('releases dependencies of nested computeds', () => {
			const events: string[] = [];
			const shared = tracked('shared', events);
			const failing = tracked('failing', events, true);
			const inner = new Computed(() => shared.get() + failing.get());
			const outer = new Computed(() => inner.get() + 1);
			const watcher = new subtle.Watcher(() => undefined);

			expect(() => watcher.watch(outer)).toThrow(boom);
			expect(events).toEqual(['shared:watched', 'failing:watched', 'shared:unwatched']);
			expect(shared.getWatcherCount()).toBe(0);
			expect(inner.getWatcherCount()).toBe(0);
			expect(outer.getWatcherCount()).toBe(0);
		});

		test('releases the dependencies of a computed whose own watched hook throws', () => {
			const events: string[] = [];
			const shared = tracked('shared', events);
			const derived = new Computed(() => shared.get(), {
				[subtle.watched]() {
					throw boom;
				},
			});
			const watcher = new subtle.Watcher(() => undefined);

			expect(() => watcher.watch(derived)).toThrow(boom);
			expect(events).toEqual(['shared:watched', 'shared:unwatched']);
			expect(shared.getWatcherCount()).toBe(0);
		});

		test('allows a successful watch after a failed one', () => {
			const events: string[] = [];
			let shouldThrow = true;
			const shared = tracked('shared', events);
			const flaky = new State(0, {
				[subtle.watched]() {
					events.push('flaky:watched');

					if (shouldThrow) {
						throw boom;
					}
				},
				[subtle.unwatched]() {
					events.push('flaky:unwatched');
				},
			});
			const derived = new Computed(() => shared.get() + flaky.get());
			const notifications: number[] = [];
			const watcher = new subtle.Watcher(() => {
				notifications.push(1);
			});

			expect(() => watcher.watch(derived)).toThrow(boom);

			shouldThrow = false;
			watcher.watch(derived);
			shared.set(1);

			expect(notifications).toHaveLength(1);
			expect(shared.getWatcherCount()).toBe(1);

			watcher.unwatch(derived);
			expect(shared.getWatcherCount()).toBe(0);
			expect(flaky.getWatcherCount()).toBe(0);
		});
	});

	describe('a throwing unwatched hook', () => {
		test('still releases every signal and dependency, then rethrows', () => {
			const events: string[] = [];
			const boom = new Error('unwatched failed');
			const shared = new State(0, {
				[subtle.unwatched]() {
					events.push('shared:unwatched');
				},
			});
			const derived = new Computed(() => shared.get(), {
				[subtle.unwatched]() {
					events.push('derived:unwatched');
					throw boom;
				},
			});
			const other = new State(0, {
				[subtle.unwatched]() {
					events.push('other:unwatched');
				},
			});
			const watcher = new subtle.Watcher(() => undefined);

			watcher.watch(derived, other);
			expect(() => watcher.unwatch(derived, other)).toThrow(boom);

			expect(events).toEqual(['shared:unwatched', 'derived:unwatched', 'other:unwatched']);
			expect(shared.getWatcherCount()).toBe(0);
			expect(() => watcher.unwatch(derived)).toThrow('Signal is not watched by this watcher.');
			expect(() => watcher.unwatch(other)).toThrow('Signal is not watched by this watcher.');

			watcher.watch(derived);
			expect(shared.getWatcherCount()).toBe(1);
		});

		test('reports several failures as an AggregateError', () => {
			const first = new Error('first');
			const second = new Error('second');
			const a = new State(0, {
				[subtle.unwatched]() {
					throw first;
				},
			});
			const b = new State(0, {
				[subtle.unwatched]() {
					throw second;
				},
			});
			const watcher = new subtle.Watcher(() => undefined);

			watcher.watch(a, b);

			try {
				watcher.unwatch(a, b);
				expect.unreachable();
			} catch (error) {
				expect(error).toBeInstanceOf(AggregateError);
				expect((error as AggregateError).errors).toEqual([first, second]);
			}
		});
	});

	describe('release details', () => {
		const hooks = (name: string, events: string[], options: { watched?: Error; unwatched?: Error } = {}) =>
			new State(0, {
				[subtle.watched]() {
					events.push(`${name}:watched`);

					if (options.watched) {
						throw options.watched;
					}
				},
				[subtle.unwatched]() {
					events.push(`${name}:unwatched`);

					if (options.unwatched) {
						throw options.unwatched;
					}
				},
			});

		test('releases the dependencies a computed watched in reverse order', () => {
			const events: string[] = [];
			const a = hooks('a', events);
			const b = hooks('b', events);
			const c = hooks('c', events, { watched: new Error('c') });
			const derived = new Computed(() => a.get() + b.get() + c.get());
			const watcher = new subtle.Watcher(() => undefined);

			expect(() => watcher.watch(derived)).toThrow('c');
			expect(events).toEqual(['a:watched', 'b:watched', 'c:watched', 'b:unwatched', 'a:unwatched']);
		});

		test('releases the dependencies of a computed whose own watched hook throws in reverse order', () => {
			const events: string[] = [];
			const a = hooks('a', events);
			const b = hooks('b', events);
			const derived = new Computed(() => a.get() + b.get(), {
				[subtle.watched]() {
					throw new Error('own');
				},
			});
			const watcher = new subtle.Watcher(() => undefined);

			expect(() => watcher.watch(derived)).toThrow('own');
			expect(events).toEqual(['a:watched', 'b:watched', 'b:unwatched', 'a:unwatched']);
		});

		test('retries the sync on the next read when a recompute of a watched computed fails to watch', () => {
			const events: string[] = [];
			const boom = new Error('b');
			let failing = true;
			const flag = new State(false);
			const a = hooks('a', events);
			const b = new State(0, {
				[subtle.watched]() {
					events.push('b:watched');

					if (failing) {
						throw boom;
					}
				},
			});
			const derived = new Computed(() => (flag.get() ? a.get() + b.get() : a.get()));
			const notifications: number[] = [];
			const watcher = new subtle.Watcher(() => {
				notifications.push(1);
			});

			watcher.watch(derived);
			flag.set(true);

			expect(() => derived.get()).toThrow(boom);
			expect(b.getWatcherCount()).toBe(0);
			expect(() => derived.get()).toThrow(boom);

			failing = false;
			b.set(5);
			expect(derived.get()).toBe(5);
			expect(b.getWatcherCount()).toBe(1);

			watcher.watch(derived);
			b.set(6);
			expect(notifications).toHaveLength(2);
			expect(derived.get()).toBe(6);
		});

		test('keeps pending signals and the notification latch when a watch fails', () => {
			const events: string[] = [];
			const first = hooks('first', events);
			const failing = hooks('failing', events, { watched: new Error('x') });
			const notifications: number[] = [];
			const watcher = new subtle.Watcher(() => {
				notifications.push(1);
			});

			watcher.watch(first);
			first.set(1);
			expect(() => watcher.watch(failing)).toThrow('x');
			first.set(2);

			expect(watcher.getPending()).toEqual([first]);
			expect(notifications).toHaveLength(1);
			expect(failing.getWatcherCount()).toBe(0);
		});

		test('drops errors thrown while rolling back in favor of the watched error', () => {
			const events: string[] = [];
			const watchedError = new Error('watched');
			const earlier = hooks('earlier', events, { unwatched: new Error('unwatched') });
			const failing = hooks('failing', events, { watched: watchedError });
			const watcher = new subtle.Watcher(() => undefined);

			expect(() => watcher.watch(earlier, failing)).toThrow(watchedError);
			expect(earlier.getWatcherCount()).toBe(0);
		});

		test('reports every failing unwatched hook of a computed and its dependencies', () => {
			const events: string[] = [];
			const e1 = new Error('dep1');
			const e2 = new Error('dep2');
			const e3 = new Error('own');
			const dep1 = hooks('dep1', events, { unwatched: e1 });
			const dep2 = hooks('dep2', events, { unwatched: e2 });
			const derived = new Computed(() => dep1.get() + dep2.get(), {
				[subtle.unwatched]() {
					events.push('own:unwatched');
					throw e3;
				},
			});
			const watcher = new subtle.Watcher(() => undefined);

			watcher.watch(derived);

			try {
				watcher.unwatch(derived);
				expect.unreachable();
			} catch (error) {
				expect(error).toBeInstanceOf(AggregateError);
				const [inner, own] = (error as AggregateError).errors;

				expect(inner).toBeInstanceOf(AggregateError);
				expect((inner as AggregateError).errors).toEqual([e1, e2]);
				expect(own).toBe(e3);
			}

			expect(events).toContain('own:unwatched');
			expect(dep1.getWatcherCount()).toBe(0);
			expect(dep2.getWatcherCount()).toBe(0);

			watcher.watch(derived);
			expect(dep1.getWatcherCount()).toBe(1);
		});

		test('releases a dropped dependency and watches the new one before rethrowing', () => {
			const events: string[] = [];
			const boom = new Error('dropped');
			const flag = new State(true);
			const a = hooks('a', events, { unwatched: boom });
			const b = hooks('b', events);
			const derived = new Computed(() => (flag.get() ? a.get() : b.get()));
			const watcher = new subtle.Watcher(() => undefined);

			watcher.watch(derived);
			flag.set(false);

			expect(() => derived.get()).toThrow(boom);
			expect(a.getWatcherCount()).toBe(0);
			expect(b.getWatcherCount()).toBe(1);
			expect(derived.get()).toBe(0);
		});
	});
});
