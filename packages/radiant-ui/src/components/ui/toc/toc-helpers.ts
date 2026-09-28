/** Safely run `querySelector`; invalid selectors return `null`. */
export function querySelectorSafe(root: ParentNode, selector: string): HTMLElement | null {
	try {
		return root.querySelector(selector);
	} catch {
		return null;
	}
}

/** Safely run `querySelectorAll`; invalid selectors return `[]`. */
export function querySelectorAllSafe(root: ParentNode, selector: string): HTMLElement[] {
	try {
		return Array.from(root.querySelectorAll(selector));
	} catch {
		return [];
	}
}

/** Slugify heading text for generated fragment IDs. */
export function slugifyHeadingText(text: string): string {
	return text
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]/g, '');
}

/**
 * Assign a unique `id` when missing, avoiding collisions with `usedIds` and the document.
 *
 * @remarks
 * Existing IDs are left untouched and recorded in `usedIds`. Generated IDs use
 * `base`, `base-2`, … until free.
 */
export function ensureUniqueHeadingId(
	heading: HTMLElement,
	usedIds: Set<string>,
	isTaken: (id: string) => boolean = (id) => document.getElementById(id) !== null,
): string {
	if (heading.id) {
		usedIds.add(heading.id);
		return heading.id;
	}

	const base = slugifyHeadingText(heading.textContent || '') || 'section';
	let id = base;
	let suffix = 2;
	while (usedIds.has(id) || isTaken(id)) {
		id = `${base}-${suffix}`;
		suffix += 1;
	}

	heading.id = id;
	usedIds.add(id);
	return id;
}

/** Viewport Y where a heading counts as active (`scrollOffset` below the scroll root top). */
export function trackingLineY(scrollRoot: HTMLElement | Window, scrollOffset: number): number {
	if (scrollRoot instanceof HTMLElement) {
		return scrollRoot.getBoundingClientRect().top + scrollOffset;
	}
	return scrollOffset;
}

/** Scroll so `heading` sits `scrollOffset` below the scroll root's visible top. */
export function scrollHeadingIntoView(
	heading: HTMLElement,
	scrollRoot: HTMLElement | Window,
	scrollOffset: number,
	behavior: ScrollBehavior,
): void {
	if (scrollRoot instanceof HTMLElement) {
		const rootRect = scrollRoot.getBoundingClientRect();
		const headingRect = heading.getBoundingClientRect();
		scrollRoot.scrollTo({
			top: scrollRoot.scrollTop + (headingRect.top - rootRect.top) - scrollOffset,
			behavior,
		});
		return;
	}

	window.scrollTo({
		top: window.scrollY + heading.getBoundingClientRect().top - scrollOffset,
		behavior,
	});
}
