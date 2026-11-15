const ROVING_ITEM_SELECTOR = 'a[href], button, input, select, textarea, [tabindex]';

const FOCUSABLE_CANDIDATE_SELECTOR = `${ROVING_ITEM_SELECTOR}, summary, [contenteditable], audio[controls], video[controls], iframe`;

function isFocusableCandidate(element: HTMLElement): boolean {
	return (
		!element.hasAttribute('disabled') &&
		element.getAttribute('tabindex') !== '-1' &&
		element.getAttribute('type') !== 'hidden' &&
		element.getAttribute('contenteditable') !== 'false'
	);
}

/**
 * Returns focusable descendants using selectors supported by minimal-DOM SSR.
 *
 * @remarks Filters `disabled`, `tabindex="-1"`, `input[type=hidden]` and `contenteditable="false"` in JavaScript
 * instead of `:not()` pseudo-classes. Besides form controls and links it matches `summary`, `[contenteditable]`,
 * `audio[controls]`, `video[controls]` and `iframe`. It does not check visibility or `inert`; use
 * {@link getFocusableElements} for that.
 */
export function queryFocusableCandidates(root: ParentNode): HTMLElement[] {
	return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_CANDIDATE_SELECTOR)).filter(isFocusableCandidate);
}

/**
 * Returns the full roving-tabindex collection for a container.
 *
 * @remarks Unlike {@link queryFocusableCandidates}, inactive roving items with `tabindex="-1"`
 * stay in the list so arrow-key navigation can move across the whole set.
 */
export function queryRovingTabindexItems(root: ParentNode): HTMLElement[] {
	return Array.from(root.querySelectorAll<HTMLElement>(ROVING_ITEM_SELECTOR)).filter(
		(element) => !element.hasAttribute('disabled'),
	);
}

/** Returns the first focusable descendant, or `undefined` when none match. */
export function findFirstFocusableCandidate(root: ParentNode): HTMLElement | undefined {
	return queryFocusableCandidates(root)[0];
}

function isAvailable(element: HTMLElement): boolean {
	if (element.matches(':disabled') || element.closest('[hidden], [inert]')) {
		return false;
	}
	return element.checkVisibility({ visibilityProperty: true });
}

/**
 * Returns focusable descendants in DOM order, skipping nodes that are not rendered, sit inside `[hidden]` or
 * `[inert]`, have `visibility: hidden`, are disabled (including by a `<fieldset disabled>` ancestor), or are
 * `input[type=hidden]`.
 *
 * @remarks Needs layout (`checkVisibility`, Baseline widely available since Safari 17.4) and `:disabled`, so it is for the browser, not minimal-DOM SSR.
 */
export function getFocusableElements(root: ParentNode): HTMLElement[] {
	return queryFocusableCandidates(root).filter(isAvailable);
}
