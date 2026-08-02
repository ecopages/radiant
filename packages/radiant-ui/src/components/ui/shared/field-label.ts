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

	return owner.parentElement?.querySelector<HTMLLabelElement>('[data-rui-field-label], label.rui-label') ?? null;
}

/** Applies the shared label-to-control ARIA contract for an unmanaged control. */
export function syncFieldLabel(owner: HTMLElement, control: HTMLElement | null, options: FieldLabelSyncOptions): void {
	if (!control || control.hasAttribute('data-rui-field-managed')) {
		return;
	}

	const labelElement = findAssociatedLabel(owner);
	if (labelElement) {
		if (!labelElement.id) {
			labelElement.id = options.labelId;
		}
		if (!labelElement.htmlFor) {
			labelElement.htmlFor = options.controlId;
		}
		control.setAttribute('aria-labelledby', labelElement.id);
		control.removeAttribute('aria-label');
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
