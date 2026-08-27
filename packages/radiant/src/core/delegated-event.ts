/**
 * Returns whether a bubbling event should fire a delegated listener on `root`.
 *
 * @remarks
 * Resolves text-node targets to their owning element, then uses `closest()` so a
 * click on a nested icon still matches a wrapping button. `matches()` alone
 * misses that case. The match must still be `root` or contained by it.
 */
export function eventMatchesDelegatedSelector(event: Event, root: Node, selector: string): boolean {
	const eventTarget = event.target;
	if (!(eventTarget instanceof Node)) return false;

	const elementTarget = eventTarget instanceof Element ? eventTarget : eventTarget.parentElement;
	if (!elementTarget) return false;

	const matched = elementTarget.closest(selector);
	return Boolean(matched && (matched === root || root.contains(matched)));
}
