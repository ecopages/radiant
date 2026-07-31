const FOCUSABLE_CANDIDATE_SELECTOR = 'a[href], button, input, select, textarea, [tabindex]';

function isFocusableCandidate(element: HTMLElement): boolean {
	return !element.hasAttribute('disabled') && element.getAttribute('tabindex') !== '-1';
}

/**
 * Returns focusable descendants using selectors supported by minimal-DOM SSR.
 *
 * @remarks Filters `disabled` and `tabindex="-1"` in JavaScript instead of `:not()` pseudo-classes.
 */
export function queryFocusableCandidates(root: ParentNode): HTMLElement[] {
	return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_CANDIDATE_SELECTOR)).filter(isFocusableCandidate);
}

/** Returns the first focusable descendant, or `undefined` when none match. */
export function findFirstFocusableCandidate(root: ParentNode): HTMLElement | undefined {
	return queryFocusableCandidates(root)[0];
}

function isVisible(element: HTMLElement): boolean {
	return element.getClientRects().length > 0 && !element.closest('[hidden]');
}

/** Returns focusable descendants in DOM order, skipping hidden nodes. */
export function getFocusableElements(root: ParentNode): HTMLElement[] {
	return queryFocusableCandidates(root).filter(isVisible);
}
