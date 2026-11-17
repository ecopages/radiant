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
 * Lets `milliseconds` pass: on the fake clock when the test installed one, else for real.
 *
 * @remarks The real wait is for negative assertions that nothing changed, which have no signal to wait on.
 */
export async function settle(milliseconds: number): Promise<void> {
	if (vi.isFakeTimers()) {
		vi.advanceTimersByTime(milliseconds);
		return;
	}
	await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
