/** Resolves with the next `type` event on `target`; create it before the action that dispatches the event. */
export function once<E extends Event = Event>(target: EventTarget, type: string): Promise<E> {
	return new Promise((resolve) => target.addEventListener(type, (event) => resolve(event as E), { once: true }));
}
