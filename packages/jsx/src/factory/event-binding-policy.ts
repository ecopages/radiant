/**
 * Bubbling DOM event names that Radiant auto-delegates for `on:*` bindings.
 *
 * Events outside this fixed allowlist fall back to direct element listeners even
 * when authored with `on:*`.
 */
export const DELEGATED_EVENT_NAMES = [
	'beforeinput',
	'click',
	'contextmenu',
	'dblclick',
	'focusin',
	'focusout',
	'input',
	'keydown',
	'keyup',
	'mousedown',
	'mouseout',
	'mouseover',
	'mouseup',
	'pointerdown',
	'pointerout',
	'pointerover',
	'pointerup',
	'touchend',
	'touchmove',
	'touchstart',
] as const;

/** Union of event names serviced by Radiant's root-scoped delegation path. */
export type DelegatedEventName = (typeof DELEGATED_EVENT_NAMES)[number];

const DELEGATED_EVENT_NAME_SET = new Set<string>(DELEGATED_EVENT_NAMES);

/**
 * Returns whether `on:*` should use root-scoped delegation for the given event.
 *
 * @param eventName DOM event name extracted from a JSX binding such as `on:click`.
 * @returns `true` when Radiant should service the binding through the delegated path.
 */
export function shouldDelegateEventBinding(eventName: string): eventName is DelegatedEventName {
	return DELEGATED_EVENT_NAME_SET.has(eventName);
}
