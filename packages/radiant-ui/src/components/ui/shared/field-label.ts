export type FieldLabelSyncOptions = {
	controlId: string;
	label: string;
	labelId: string;
};

/** Finds the visible label associated with a composed field control. */
export function findAssociatedLabel(owner: HTMLElement): HTMLLabelElement | null {
	const previous = owner.previousElementSibling;
	if (previous?.tagName.toLowerCase() === 'label') {
		return previous as HTMLLabelElement;
	}

	return owner.parentElement?.querySelector<HTMLLabelElement>('[data-rui-field-label]') ?? null;
}

/** Points a visible label at a composed control and prefers it over `aria-label`. */
export function bindVisibleLabel(
	label: HTMLLabelElement,
	control: HTMLElement,
	options: { controlId: string; labelId: string },
): void {
	if (!label.id) {
		label.id = options.labelId;
	}
	if (!label.htmlFor) {
		label.htmlFor = options.controlId;
	}
	control.setAttribute('aria-labelledby', label.id);
	control.removeAttribute('aria-label');
}

/** Applies the shared label-to-control ARIA contract for an unmanaged control. */
export function syncFieldLabel(owner: HTMLElement, control: HTMLElement | null, options: FieldLabelSyncOptions): void {
	if (!control || control.hasAttribute('data-rui-field-managed')) {
		return;
	}

	const labelElement = findAssociatedLabel(owner);
	if (labelElement) {
		bindVisibleLabel(labelElement, control, options);
		return;
	}

	if (options.label) {
		control.setAttribute('aria-label', options.label);
		control.removeAttribute('aria-labelledby');
		return;
	}

	control.removeAttribute('aria-label');
	control.removeAttribute('aria-labelledby');
}
