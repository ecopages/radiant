import { getNodeAtPath, getNodePath } from './path-utils.ts';

/**
 * Selection and active-element snapshot captured before render work that might
 * replace DOM nodes.
 */
export type FocusSnapshot = {
	element: HTMLElement;
	path: number[];
	selectionStart?: number | null;
	selectionEnd?: number | null;
	selectionDirection?: 'backward' | 'forward' | 'none' | null;
};

/**
 * Captures the currently focused descendant and selection state so rerenders can
 * preserve editing continuity when possible.
 *
 * Both the element itself and its child-index path are recorded. Identity is the
 * accurate signal when reconciliation patches nodes in place; the path is the
 * fallback for the case where the element was replaced outright and only its
 * position survives.
 */
export function captureFocusSnapshot(target: HTMLElement): FocusSnapshot | undefined {
	const activeElement = document.activeElement;

	if (!(activeElement instanceof HTMLElement) || !target.contains(activeElement)) {
		return undefined;
	}

	return {
		element: activeElement,
		path: getNodePath(target, activeElement),
		selectionDirection: isSelectableInput(activeElement) ? activeElement.selectionDirection : undefined,
		selectionEnd: isSelectableInput(activeElement) ? activeElement.selectionEnd : undefined,
		selectionStart: isSelectableInput(activeElement) ? activeElement.selectionStart : undefined,
	};
}

/** Restores the focus snapshot captured before render work. */
export function restoreFocusSnapshot(target: HTMLElement, snapshot: FocusSnapshot | undefined): void {
	if (!snapshot) {
		return;
	}

	// The element survived and never lost focus, so there is nothing to restore.
	// Re-applying the selection here would clobber a caret the user has since moved.
	if (document.activeElement === snapshot.element) {
		return;
	}

	const nextFocusedNode = target.contains(snapshot.element) ? snapshot.element : getNodeAtPath(target, snapshot.path);

	if (!(nextFocusedNode instanceof HTMLElement)) {
		return;
	}

	nextFocusedNode.focus({ preventScroll: true });

	if (isSelectableInput(nextFocusedNode)) {
		nextFocusedNode.setSelectionRange(
			snapshot.selectionStart ?? nextFocusedNode.value.length,
			snapshot.selectionEnd ?? nextFocusedNode.value.length,
			snapshot.selectionDirection ?? undefined,
		);
	}
}

/**
 * Narrows `element` to the subset of `HTMLElement` subtypes that expose
 * `setSelectionRange`, `selectionStart`, `selectionEnd`, and `selectionDirection`.
 *
 * @param element Element to test.
 */
function isSelectableInput(element: HTMLElement): element is HTMLInputElement | HTMLTextAreaElement {
	if (element instanceof HTMLTextAreaElement) {
		return true;
	}

	if (!(element instanceof HTMLInputElement)) {
		return false;
	}

	return ['text', 'search', 'tel', 'url', 'password', 'email'].includes(element.type);
}
