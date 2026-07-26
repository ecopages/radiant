const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(', ');

function isVisible(element: HTMLElement): boolean {
	return element.getClientRects().length > 0 && !element.closest('[hidden]');
}

/** Returns focusable descendants in DOM order, skipping hidden nodes. */
export function getFocusableElements(root: ParentNode): HTMLElement[] {
	return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
}
