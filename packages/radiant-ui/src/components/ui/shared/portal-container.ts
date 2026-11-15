/**
 * Where a portaled surface goes: an element, a function that returns one, or a CSS selector.
 *
 * @remarks
 * The attribute form of `portal-container` is always a selector. A function or a selector is resolved each time the
 * surface opens, so a container added to the page after the component connects still works.
 */
export type RuiPortalContainer = ParentNode | (() => ParentNode | null) | string;

/**
 * Shared `@prop` options for `portalContainer`: the attribute is a CSS selector, the property takes any
 * `RuiPortalContainer`.
 *
 * @remarks `type: String` makes the server render a selector as plain text, not JSON. `transform.fromAttribute` owns the value type, so the property can hold an element or a function too.
 */
export const portalContainerPropOptions = {
	type: String,
	attribute: 'portal-container',
	defaultValue: null,
	transform: {
		fromAttribute: (value: string | null): RuiPortalContainer | null => value?.trim() || null,
	},
} as const;

/** Resolves a `portalContainer` to an element now; `null` when it is unset or a selector matches nothing. */
export function resolvePortalContainer(container: RuiPortalContainer | null): ParentNode | null {
	if (typeof container === 'string') {
		return document.querySelector(container);
	}
	if (typeof container === 'function') {
		return container();
	}
	return container;
}
