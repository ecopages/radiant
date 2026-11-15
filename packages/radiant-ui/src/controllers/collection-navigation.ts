import { uniqueId } from '@/lib/unique-id';

/** Returns enabled, visible options in their current DOM order. */
export function getVisibleCollectionOptions(options: HTMLElement[]): HTMLElement[] {
	return options.filter((option) => !option.hidden && option.getAttribute('aria-disabled') !== 'true');
}

/** Clears active styling and the active descendant relationship for a collection. */
export function clearCollectionActive(options: HTMLElement[], activeHost: HTMLElement | null): void {
	activeHost?.removeAttribute('aria-activedescendant');
	for (const option of options) {
		option.removeAttribute('data-active');
	}
}

/**
 * Applies active styling and the active descendant relationship to one option.
 *
 * @remarks
 * An option without an `id` gets a document-unique one built from `idPrefix` and kept afterwards. The id is not
 * derived from `index`, which counts visible options only and shifts as the list is filtered. Sets
 * `aria-activedescendant` on `activeHost` and `data-active` on the option; `role="option"`, `aria-selected` and
 * `aria-expanded` stay with the caller.
 */
export function setCollectionActive(
	options: HTMLElement[],
	visibleOptions: HTMLElement[],
	index: number,
	activeHost: HTMLElement | null,
	idPrefix: string,
): HTMLElement | null {
	clearCollectionActive(options, activeHost);
	const active = visibleOptions[index];
	if (!active || !activeHost) {
		return null;
	}

	if (!active.id) {
		active.id = uniqueId(idPrefix);
	}
	active.setAttribute('data-active', 'true');
	activeHost.setAttribute('aria-activedescendant', active.id);
	active.scrollIntoView({ block: 'nearest' });
	return active;
}
