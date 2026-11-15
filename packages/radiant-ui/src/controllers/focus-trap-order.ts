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

/**
 * Decides which item to focus at one end of the loop, for code that moves focus inside the trap.
 *
 * @remarks
 * Shares the empty-loop answer of `resolveTrapMove`: `surface` when no item can take focus.
 *
 * @example
 * ```ts
 * resolveTrapEdge(['a', 'b', 'c'], 'last'); // { kind: 'item', item: 'c' }
 * ```
 */
export function resolveTrapEdge<T>(
	items: readonly T[],
	edge: 'first' | 'last',
): Exclude<TrapMove<T>, { kind: 'native' }> {
	if (items.length === 0) {
		return { kind: 'surface' };
	}
	return { kind: 'item', item: edge === 'first' ? items[0] : items[items.length - 1] };
}

/**
 * Picks the element focus returns to when a trap is destroyed.
 *
 * @remarks
 * The owner's choice wins while it is still usable (connected); otherwise the element remembered at `attach()`
 * is used. Focusing a remembered element that has since left the document does nothing, so it needs no check.
 *
 * @example
 * ```ts
 * pickReturnTarget(chosen, remembered, (el) => el.isConnected);
 * ```
 */
export function pickReturnTarget<T>(chosen: T | null, remembered: T | null, isUsable: (item: T) => boolean): T | null {
	return chosen !== null && isUsable(chosen) ? chosen : remembered;
}
