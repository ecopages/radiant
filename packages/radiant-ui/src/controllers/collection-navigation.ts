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

/** Applies active styling and the active descendant relationship to one option. */
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
		active.id = `${idPrefix}-${index}`;
	}
	active.setAttribute('data-active', 'true');
	activeHost.setAttribute('aria-activedescendant', active.id);
	active.scrollIntoView({ block: 'nearest' });
	return active;
}
