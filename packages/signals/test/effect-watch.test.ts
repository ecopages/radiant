import { describe, expect, test, vi } from 'vitest';
import { State, effect, watch } from '../index';

async function flushMicrotask(): Promise<void> {
	await Promise.resolve();
}

describe('effect', () => {
	test('reruns once through the scheduler and cleans up before the next run', async () => {
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
		await flushMicrotask();
		dispose();

		expect(events).toEqual(['run:1', 'cleanup:1', 'run:3', 'cleanup:3']);
	});

	test('custom schedulers defer reruns and collapse multiple invalidations', () => {
		const count = new State(1);
		const scheduledRuns: Array<() => void> = [];
		const values: number[] = [];

		effect(
			() => {
				values.push(count.get());
			},
			{
				scheduler(run) {
					scheduledRuns.push(run);
				},
			},
		);

		count.set(2);
		count.set(3);

		expect(values).toEqual([1]);
		expect(scheduledRuns).toHaveLength(1);

		scheduledRuns[0]?.();

		expect(values).toEqual([1, 3]);
	});

	test('dispose stops future reruns and runs the latest cleanup once', async () => {
		const count = new State(1);
		const events: string[] = [];
		const dispose = effect(() => {
			const value = count.get();
			events.push(`run:${value}`);

			return () => {
				events.push(`cleanup:${value}`);
			};
		});

		dispose();
		count.set(2);
		await flushMicrotask();

		expect(events).toEqual(['run:1', 'cleanup:1']);
	});

	test('dispose is idempotent and cancels queued reruns', () => {
		const count = new State(1);
		const scheduledRuns: Array<() => void> = [];
		const events: string[] = [];
		const dispose = effect(
			() => {
				events.push(`run:${count.get()}`);
				return () => {
					events.push('cleanup');
				};
			},
			{
				scheduler(run) {
					scheduledRuns.push(run);
				},
			},
		);

		count.set(2);
		expect(scheduledRuns).toHaveLength(1);

		dispose();
		dispose();
		scheduledRuns[0]?.();

		expect(events).toEqual(['run:1', 'cleanup']);
	});

	test('updates effect subscriptions when the dependency set changes', async () => {
		const usePrimary = new State(true);
		const primary = new State(1);
		const secondary = new State(10);
		const values: number[] = [];
		const dispose = effect(() => {
			values.push(usePrimary.get() ? primary.get() : secondary.get());
		});

		usePrimary.set(false);
		await flushMicrotask();
		primary.set(2);
		await flushMicrotask();
		secondary.set(20);
		await flushMicrotask();
		dispose();

		expect(values).toEqual([1, 10, 20]);
	});
});

describe('watch', () => {
	test('observes derived values and receives the previous value', async () => {
		const count = new State(1);
		const notify = vi.fn();
		const dispose = watch(
			() => count.get(),
			(nextValue, previousValue) => {
				notify({ nextValue, previousValue });
			},
		);

		count.set(2);
		await flushMicrotask();
		dispose();

		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith({ nextValue: 2, previousValue: 1 });
	});

	test('immediate mode invokes the callback during the first run', () => {
		const count = new State(1);
		const notify = vi.fn();
		const dispose = watch(
			() => count.get(),
			(nextValue, previousValue) => {
				notify({ nextValue, previousValue });
			},
			{ immediate: true },
		);

		dispose();

		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith({ nextValue: 1, previousValue: undefined });
	});

	test('custom schedulers defer notifications and preserve the latest value', () => {
		const count = new State(0);
		const scheduledRuns: Array<() => void> = [];
		const notify = vi.fn();
		const dispose = watch(() => count.get(), notify, {
			scheduler(run) {
				scheduledRuns.push(run);
			},
		});

		count.set(1);
		count.set(2);

		expect(notify).not.toHaveBeenCalled();
		expect(scheduledRuns).toHaveLength(1);

		scheduledRuns[0]?.();
		dispose();

		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith(2, 0);
	});

	test('uses watch equality to suppress redundant derived notifications', async () => {
		const count = new State(0);
		const notify = vi.fn();
		const dispose = watch(() => ((count.get() & 1) === 0 ? 'even' : 'odd'), notify, {
			equals(previousValue, nextValue) {
				return previousValue === nextValue;
			},
		});

		count.set(2);
		await flushMicrotask();
		count.set(3);
		await flushMicrotask();
		dispose();

		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith('odd', 'even');
	});
});
