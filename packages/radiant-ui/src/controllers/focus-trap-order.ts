/** What a Tab or Shift+Tab press inside a trapped surface should do. */
export type TrapMove<T> = { kind: 'native' } | { kind: 'item'; item: T } | { kind: 'surface' };

/**
 * Decides where focus goes when Tab or Shift+Tab is pressed with focus inside a trapped surface.
 *
 * @remarks
 * `native` means the browser's own move already stays inside the loop, so the key is left alone. `surface`
 * means no item can take focus, so focus stays on the surface. When `strict` is true, an `active` item that is
 * not in the loop (a `tabindex="-1"` node, or the surface itself) is pulled into it, at the first item for Tab
 * and the last for Shift+Tab; otherwise it is left to the browser.
 *
 * Generic over the item so the decision needs no DOM.
 *
 * @example
 * ```ts
 * resolveTrapMove(['a', 'b', 'c'], 'c', false, false); // { kind: 'item', item: 'a' }
 * ```
 */
export function resolveTrapMove<T>(items: readonly T[], active: T, backwards: boolean, strict: boolean): TrapMove<T> {
	if (items.length === 0) {
		return { kind: 'surface' };
	}
	const first = items[0];
	const last = items[items.length - 1];
	if (strict && !items.includes(active)) {
		return { kind: 'item', item: backwards ? last : first };
	}
	if (backwards && active === first) {
		return { kind: 'item', item: last };
	}
	if (!backwards && active === last) {
		return { kind: 'item', item: first };
	}
	return { kind: 'native' };
}
