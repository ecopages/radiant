const MEDIA_EVENTS = [
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
];

/**
 * Re-runs `check` until it stops throwing, each time the page signals a change: a DOM mutation, or a media event
 * from any element (they do not bubble, so they are caught in the capture phase).
 *
 * @remarks Nothing here has a time budget; the test's own timeout bounds a wait whose signal never comes. A node
 * that left the document reports to neither the observer nor the capture listeners, so pass it as `detached`.
 */
export function until(check: () => void, ...detached: Node[]): Promise<void> {
	return new Promise((resolve) => {
		const attempt = () => {
			try {
				check();
			} catch {
				return;
			}
			observer.disconnect();
			[document, ...detached].forEach((target) =>
				MEDIA_EVENTS.forEach((type) => target.removeEventListener(type, attempt, true)),
			);
			resolve();
		};
		const observer = new MutationObserver(attempt);
		[document, ...detached].forEach((target) => {
			observer.observe(target, { attributes: true, childList: true, characterData: true, subtree: true });
			MEDIA_EVENTS.forEach((type) => target.addEventListener(type, attempt, true));
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
		const attempt = () => {
			try {
				check();
			} catch {
				requestAnimationFrame(attempt);
				return;
			}
			resolve();
		};
		attempt();
	});
}

/** Resolves with the next `type` event on `target`; create it before the action that dispatches the event. */
export function once(target: EventTarget, type: string): Promise<Event> {
	return new Promise((resolve) => target.addEventListener(type, resolve, { once: true }));
}
