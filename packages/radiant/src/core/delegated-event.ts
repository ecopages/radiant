import { isPartOwnedBy } from './parts';

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
 * Returns whether a bubbling event happened inside a part named `ref` that `root` owns.
 *
 * @remarks
 * Walks up from the target to `root`, skipping same-named parts that another host owns, and accepts the
 * nearest one `root` owns. Matching by containment keeps an event on a nested host's part from firing the
 * outer handler unless that part sits inside an outer part of the same name, and lets a container part
 * hear events from nested hosts that reuse a common name such as `root` or `trigger`. A `data-ref` on
 * `root` itself never matches, unlike the selector path, which accepts `root`. The walk ends at `root`.
 * `selector` is the part's `partSelector(ref)`, built once by the caller rather than on every event.
 */
export function eventMatchesDelegatedRef(event: Event, root: Element, selector: string): boolean {
	let matched = closestFromTarget(event, selector);

	while (matched && matched !== root && root.contains(matched)) {
		if (isPartOwnedBy(matched, root)) {
			return true;
		}

		matched = matched.parentElement?.closest(selector) ?? null;
	}

	return false;
}
