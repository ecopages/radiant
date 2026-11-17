import { onTestFinished, vi } from 'vitest';

const SIGNAL_EVENTS = [
	'loadstart',
	'loadedmetadata',
	'loadeddata',
	'canplay',
	'play',
	'playing',
	'pause',
	'ended',
	'waiting',
	'seeking',
	'seeked',
	'timeupdate',
	'durationchange',
	'volumechange',
	'ratechange',
	'emptied',
	'error',
	'focusin',
	'focusout',
	'transitionend',
	'animationend',
	'toggle',
];

/**
 * Re-runs `check` until it stops throwing, each time the page signals a change: a DOM mutation, or a media,
 * focus, transition or toggle event from any element (some do not bubble, so they are caught in the capture phase).
 *
 * @remarks Nothing here has a time budget; the test's own timeout bounds a wait whose signal never comes. A node
 * that left the document reports to neither the observer nor the capture listeners, so pass it as `detached`.
 * The observer and listeners are removed when the check passes and when the test ends, so a wait that never resolves
 * does not outlive its test, and its last failure is logged so the timeout is diagnosable.
 */
export function until(check: () => void, ...detached: Node[]): Promise<void> {
	return new Promise((resolve) => {
		const targets = [document, ...detached];
		let settled = false;
		let lastError: unknown;
		const observer = new MutationObserver(() => attempt());
		const stop = () => {
			observer.disconnect();
			targets.forEach((target) =>
				SIGNAL_EVENTS.forEach((type) => target.removeEventListener(type, attempt, true)),
			);
		};
		function attempt() {
			try {
				check();
			} catch (error) {
				lastError = error;
				return;
			}
			settled = true;
			stop();
			resolve();
		}
		targets.forEach((target) => {
			observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
			SIGNAL_EVENTS.forEach((type) => target.addEventListener(type, attempt, true));
		});
		onTestFinished(() => {
			stop();
			if (!settled) console.error('until: the check never passed; last failure:', lastError);
		});
		attempt();
	});
}

/**
 * Re-runs `check` on every animation frame until it stops throwing.
 *
 * @remarks For canvas output, which changes in a frame callback and fires no event; a frame is the signal that a
 * paint may have happened.
 */
export function untilFrame(check: () => void): Promise<void> {
	return new Promise((resolve) => {
		let frame = 0;
		let settled = false;
		let lastError: unknown;
		const attempt = () => {
			try {
				check();
			} catch (error) {
				lastError = error;
				frame = requestAnimationFrame(attempt);
				return;
			}
			settled = true;
			resolve();
		};
		onTestFinished(() => {
			cancelAnimationFrame(frame);
			if (!settled) console.error('untilFrame: the check never passed; last failure:', lastError);
		});
		attempt();
	});
}

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

/** Installs fake timers for the two calls the players schedule with; the file's `afterEach` restores real ones. */
export const fakeTimers = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

/**
 * A negative assertion's wait: lets `count` animation frames pass so that a change the code should not make has had
 * its chance.
 *
 * @remarks Nothing signals an absence, so this is the only wait that is not on a signal. `reason` names the change
 * that would have shown up, which keeps the justification at the call site.
 */
export function nothingFollows(_reason: string, count = 5): Promise<void> {
	return new Promise((resolve) => {
		const step = (left: number) => requestAnimationFrame(() => (left <= 1 ? resolve() : step(left - 1)));
		step(count);
	});
}

/**
 * A wait on the wall clock, for what has no signal and no fake clock: a real capture, or a transition's own timing.
 *
 * @remarks `reason` states which of the two, so the justification sits at the call site.
 */
export function realWait(milliseconds: number, _reason: string): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Reads `read()` on each of the next `count` animation frames and returns the values.
 *
 * @remarks For asserting what a frame loop did frame by frame, such as a slider that follows playback or one that
 * stays still; the count is in frames, so it does not depend on how fast the machine is.
 */
export async function sampleFrames<T>(count: number, read: () => T): Promise<T[]> {
	const values: T[] = [];
	for (let frame = 0; frame < count; frame++) {
		values.push(read());
		await nothingFollows('sampling', 1);
	}
	return values;
}

/**
 * Resolves after one task, which lets the microtask that a controller defers its `destroy` to run after the host
 * element was removed or moved.
 *
 * @remarks The controllers defer `destroy` so that a move within the document does not tear them down, and removal
 * has no event of its own to wait on.
 */
export function afterDeferredDestroy(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve));
}

/**
 * Records every value written to `media.currentTime` and still performs the write.
 *
 * @remarks A seek that the element drops, such as one overtaken by `load()`, never fires `seeking`, so the write
 * itself is what shows that something tried to seek.
 */
export function recordSeekWrites(media: HTMLMediaElement): number[] {
	const writes: number[] = [];
	const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime')!;
	Object.defineProperty(media, 'currentTime', {
		configurable: true,
		get: () => descriptor.get!.call(media),
		set: (value: number) => {
			writes.push(value);
			descriptor.set!.call(media, value);
		},
	});
	return writes;
}
