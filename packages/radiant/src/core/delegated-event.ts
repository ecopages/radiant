import { isPartOwnedBy, partSelector } from './parts';

/**
 * Returns whether a bubbling event should fire a delegated listener on `root`.
 *
 * @remarks
 * Resolves text-node targets to their owning element, then uses `closest()` so a
 * click on a nested icon still matches a wrapping button. `matches()` alone
 * misses that case. The match must still be `root` or contained by it.
 */
export function eventMatchesDelegatedSelector(event: Event, root: Node, selector: string): boolean {
	const matched = closestFromTarget(event, selector);
	return Boolean(matched && (matched === root || root.contains(matched)));
}

function closestFromTarget(event: Event, selector: string): Element | null {
	const eventTarget = event.target;
	if (!(eventTarget instanceof Node)) return null;

	const elementTarget = eventTarget instanceof Element ? eventTarget : eventTarget.parentElement;
	return elementTarget?.closest(selector) ?? null;
}

/**
 * Returns whether a bubbling event came from a part named `ref` that `root` owns.
 *
 * @remarks
 * Takes the closest `[data-ref=ref]` from the target and accepts it only when `root` owns it, so a click
 * on a nested host's same-named part does not fire the outer handler. A `data-ref` on `root` itself never
 * matches, unlike the selector path, which accepts `root`.
 */
export function eventMatchesDelegatedRef(event: Event, root: Element, ref: string): boolean {
	const matched = closestFromTarget(event, partSelector(ref));
	return Boolean(matched && isPartOwnedBy(matched, root));
}
