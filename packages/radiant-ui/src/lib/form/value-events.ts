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
 * Stop the `input` and `change` events that start inside a host, so only the host's own
 * events leave it.
 *
 * @remarks One bubble listener on the host ends the event when its `target` is not the host
 * itself, so a part that is re-rendered or added later is covered too. `except` names query
 * inputs, such as a combobox text box, whose events are not the value and stay visible to the
 * page. A capture listener on an ancestor still sees the inner event, which is why a consumer
 * acts only when `event.target` is the control host (or, for a wrapper or group, one of its
 * member native inputs).
 */
export function stopInnerValueEvents<T extends HTMLElement & ControllerHost>(
	host: T,
	options: { except?: string } = {},
) {
	return createEventListenerController(host, {
		getTarget: () => host,
		type: ['input', 'change'],
		listener: (event) => {
			const target = event.target;
			if (target === host || !(target instanceof Element) || !host.contains(target)) {
				return;
			}
			if (options.except && target.closest(options.except)) {
				return;
			}
			event.stopPropagation();
		},
	});
}
