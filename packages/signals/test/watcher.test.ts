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
});
