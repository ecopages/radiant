export type RovingOrientation = 'horizontal' | 'vertical';

export type RovingNavResult = { handled: false } | { handled: true; index: number; item: HTMLElement };

/**
 * Apply the APG roving-tabindex pattern: one item is tabbable, the rest are `-1`.
 */
export function applyRovingTabindex(items: HTMLElement[], activeIndex: number): void {
	items.forEach((item, index) => {
		const next = index === activeIndex ? 0 : -1;
		if (item.tabIndex !== next) {
			item.tabIndex = next;
		}
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

const TEXT_ENTRY_INPUT_TYPES: ReadonlySet<string> = new Set([
	'text',
	'search',
	'email',
	'url',
	'tel',
	'password',
	'number',
	'date',
	'datetime-local',
	'month',
	'time',
	'week',
]);

function isTextEntry(target: EventTarget | null): boolean {
	if (target instanceof HTMLInputElement) {
		return TEXT_ENTRY_INPUT_TYPES.has(target.type);
	}
	return target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable);
}

/**
 * Whether a key press belongs to the browser or to a text-entry control, not to roving navigation.
 *
 * @remarks
 * True when Alt, Ctrl or Meta is held (browser history, select-to-start-of-document and similar shortcuts), or
 * when the event target is a text field that is not itself one of `items`, so a text field nested inside an item
 * keeps its caret keys. A text field is a `textarea`, a contenteditable element, or an `input` of type text,
 * search, email, url, tel, password, number, date, datetime-local, month, time or week. Checkboxes, radios,
 * buttons, ranges and selects stay navigable. An input that is itself an item (a radio, a toolbar text field)
 * navigates like any other item. Shift alone does not ignore the key: the pure
 * navigation functions take only the key name, and a caller that wants Shift+Arrow for selection handles it in
 * `onMove`. The pure functions below do not call this; `RovingController` does.
 */
export function isRovingKeyIgnored(event: KeyboardEvent, items: readonly HTMLElement[]): boolean {
	if (event.altKey || event.ctrlKey || event.metaKey) {
		return true;
	}
	return isTextEntry(event.target) && !items.includes(event.target as HTMLElement);
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
