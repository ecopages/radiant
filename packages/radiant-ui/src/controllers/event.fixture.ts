import { onTestFailed, onTestFinished, vi } from 'vitest';

/**
 * Resolves with the next `type` event on `target`; create it before the action that dispatches the event.
 *
 * @remarks The listener is removed when the test ends, so an event that never comes leaves nothing behind.
 */
export function once<E extends Event = Event>(target: EventTarget, type: string): Promise<E> {
	return new Promise((resolve) => {
		const listener = (event: Event) => resolve(event as E);
		target.addEventListener(type, listener, { once: true });
		onTestFinished(() => target.removeEventListener(type, listener));
	});
}

/** Resolves after `count` animation frames, at least one: layout has run and resize observers have reported. */
export function frames(count = 2): Promise<void> {
	return new Promise((resolve) => {
		const step = (left: number) => requestAnimationFrame(() => (left <= 1 ? resolve() : step(left - 1)));
		step(count);
	});
}

/** Installs fake timers for `toFake`; the file's `afterEach` calls `vi.useRealTimers()`. */
export const fakeTimers = (
	toFake: NonNullable<Parameters<typeof vi.useFakeTimers>[0]>['toFake'] = ['setTimeout', 'clearTimeout'],
) => vi.useFakeTimers({ toFake });

/** A set of waits that re-check their predicate each time the code under test calls `notify`. */
export type Waiters = {
	/** Call it from every callback the code under test emits, before the test can observe the change. */
	notify(): void;
	/** Resolves once `predicate` holds, checked now and on every `notify`; the wait is dropped when the test ends. */
	until(predicate: () => boolean): Promise<void>;
};

/**
 * Turns a controller's callbacks into the signal a test waits on, so it needs neither polling nor a time budget.
 *
 * @remarks The test's own timeout bounds a wait whose callback never comes.
 */
export function createWaiters(): Waiters {
	const waiting = new Set<() => void>();
	return {
		notify: () => [...waiting].forEach((check) => check()),
		until: (predicate) =>
			new Promise((resolve) => {
				const check = () => {
					if (!predicate()) {
						return;
					}
					waiting.delete(check);
					resolve();
				};
				waiting.add(check);
				onTestFinished(() => void waiting.delete(check));
				check();
			}),
	};
}

/** Appends `note` to the error of the test that failed, so the assertion message says what the test was waiting for. */
function annotateFailure(note: string): void {
	onTestFailed(({ task }) => {
		for (const error of task.result?.errors ?? []) {
			error.message = `${error.message}\n  while ${note}`;
		}
	});
}

/**
 * A negative assertion's wait: lets `count` frames pass so that a change the code should not make has had its chance.
 *
 * @remarks Nothing signals an absence, so this is a stated exception to waiting on a signal, with a budget of `count`
 * frames (as is `realWait`, on the wall clock). `reason` names the change that would have shown up, and is appended to
 * the error of a test that fails while or after waiting.
 */
export function nothingFollows(reason: string, count = 5): Promise<void> {
	annotateFailure(`expecting nothing to follow for ${count} frames: ${reason}`);
	return frames(count);
}

/**
 * A wait on the wall clock, for what has no signal and no fake clock: a real capture, or a transition's own timing.
 *
 * @remarks A stated exception to waiting on a signal, with a budget of `milliseconds`. `reason` states which of the
 * two, and is appended to the error of a test that fails or times out.
 */
export function realWait(milliseconds: number, reason: string): Promise<void> {
	annotateFailure(`waiting ${milliseconds} ms on the wall clock: ${reason}`);
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
