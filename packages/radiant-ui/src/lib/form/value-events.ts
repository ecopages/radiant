import type { ControllerHost } from '../../controllers/controller';
import { createEventListenerController } from '../../controllers/event-listener-controller';

/**
 * Announce a value change on a form control host with the platform's own events.
 *
 * @remarks Call it after the host holds the new `value` and has called `setValidity`, so
 * a listener reads fresh state from `event.target`. `input` is the user changing the value
 * and `change` is the user committing it; a discrete interaction passes `commit` to get
 * both back to back. The events carry no detail. Programmatic writes (a property, an
 * attribute, a store write, reset, restore) dispatch nothing.
 */
export function emitValueEvents(host: HTMLElement, options: { commit: boolean }): void {
	emitInput(host);
	if (options.commit) {
		emitChange(host);
	}
}

/** The user changed the value: a bubbling, composed `input` with no detail. */
export function emitInput(host: HTMLElement): void {
	host.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
}

/** The user committed the value: a bubbling `change` with no detail. */
export function emitChange(host: HTMLElement): void {
	host.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Stop the `input` and `change` events of an inner part that stands for the host's value,
 * so only the host's own events reach its ancestors.
 *
 * @remarks The listener sits on the part, so it ends the bubble. A capture listener on an
 * ancestor still sees the event, which is why a consumer acts only when `event.target`
 * is the control host (or, for a wrapper or group, one of its member native inputs).
 */
export function stopInnerValueEvents(host: ControllerHost, getPart: () => EventTarget | null) {
	return createEventListenerController(host, {
		getTarget: getPart,
		type: ['input', 'change'],
		listener: (event) => event.stopPropagation(),
	});
}
