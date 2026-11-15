/**
 * The item `target` is or is inside, looking up to but not including `container`, or `null`.
 *
 * @remarks
 * Shared by the controllers that route an event on the container to one of its items: `RovingController` and
 * `SortableController`.
 */
export function closestItem(
	target: EventTarget | null,
	items: readonly HTMLElement[],
	container: HTMLElement | null,
): HTMLElement | null {
	let node = target instanceof Element ? target : null;
	while (node && node !== container) {
		if (node instanceof HTMLElement && items.includes(node)) {
			return node;
		}
		node = node.parentElement;
	}
	return null;
}
