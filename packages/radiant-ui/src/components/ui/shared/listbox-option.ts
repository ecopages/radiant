const OPTION_INDICATOR_ATTR = 'data-listbox-option-indicator';

/** Returns an option label without decorative selection-indicator content. */
export function getListboxOptionLabel(option: HTMLElement): string {
	const label = option.getAttribute('data-label');
	if (label) {
		return label;
	}

	return collectLabelText(option).trim();
}

/** Returns the explicit option value or its visible label. */
export function getListboxOptionValue(option: HTMLElement): string {
	return option.getAttribute('data-value') || getListboxOptionLabel(option);
}

function collectLabelText(node: Node): string {
	if (isOptionIndicator(node)) {
		return '';
	}
	if (node.nodeType === Node.TEXT_NODE) {
		return node.textContent ?? '';
	}

	let text = '';
	for (const child of node.childNodes) {
		text += collectLabelText(child);
	}
	return text;
}

function isOptionIndicator(node: Node): node is HTMLElement {
	return node instanceof HTMLElement && node.hasAttribute(OPTION_INDICATOR_ATTR);
}
