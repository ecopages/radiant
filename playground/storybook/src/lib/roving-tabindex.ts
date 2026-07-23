export type RovingOrientation = 'horizontal' | 'vertical';

export type RovingNavResult = { handled: false } | { handled: true; index: number; item: HTMLElement };

/**
 * Apply the APG roving-tabindex pattern: one item is tabbable, the rest are `-1`.
 */
export function applyRovingTabindex(items: HTMLElement[], activeIndex: number): void {
	items.forEach((item, index) => {
		item.tabIndex = index === activeIndex ? 0 : -1;
	});
}

/**
 * Focus `items[index]` and update tabindexes. Returns the focused item, or null.
 */
export function focusRovingItem(items: HTMLElement[], index: number): HTMLElement | null {
	if (!items.length) return null;
	const next = Math.max(0, Math.min(items.length - 1, index));
	applyRovingTabindex(items, next);
	items[next]?.focus();
	return items[next] ?? null;
}

function deltaForKey(key: string, orientation: RovingOrientation): 'prev' | 'next' | 'first' | 'last' | null {
	if (key === 'Home') return 'first';
	if (key === 'End') return 'last';

	if (orientation === 'horizontal') {
		if (key === 'ArrowRight') return 'next';
		if (key === 'ArrowLeft') return 'prev';
		return null;
	}

	if (key === 'ArrowDown') return 'next';
	if (key === 'ArrowUp') return 'prev';
	return null;
}

/**
 * Handle arrow / Home / End navigation for a flat roving-tabindex collection.
 * Does not activate the item — callers decide whether to select on move.
 */
export function navigateRovingTabindex(options: {
	items: HTMLElement[];
	current: HTMLElement | null;
	key: string;
	orientation?: RovingOrientation;
	wrap?: boolean;
}): RovingNavResult {
	const { items, current, key, orientation = 'horizontal', wrap = true } = options;
	if (!items.length || !current) return { handled: false };

	const index = items.indexOf(current);
	if (index < 0) return { handled: false };

	const delta = deltaForKey(key, orientation);
	if (!delta) return { handled: false };

	let next = index;
	if (delta === 'first') next = 0;
	else if (delta === 'last') next = items.length - 1;
	else if (delta === 'next') next = wrap ? (index + 1) % items.length : Math.min(items.length - 1, index + 1);
	else next = wrap ? (index - 1 + items.length) % items.length : Math.max(0, index - 1);

	const item = focusRovingItem(items, next);
	if (!item) return { handled: false };
	return { handled: true, index: next, item };
}
