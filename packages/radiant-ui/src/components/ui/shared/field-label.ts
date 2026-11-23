import { RUI_FIELD_MANAGED_ATTR } from '@/lib/form/control-protocol';
import { uniqueId } from '@/lib/unique-id';

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

/** A host that may expose `ElementInternals.labels`, as `FormAssociatedElement.labels` does. */
export type LabelledHost = HTMLElement & { readonly labels?: NodeList };

/**
 * The ids of the `<label>` elements associated with a form-associated host through
 * `ElementInternals.labels` (`<label for="host-id">`, or a `<label>` ancestor), giving each
 * label without an id one. Empty for a host that is not form-associated, and during server
 * rendering, where `labels` is `undefined`.
 *
 * @remarks The one place a host's own labels are read, so every sync that writes
 * `aria-labelledby` includes them and none wipes them. It reads no DOM global, so it runs on the
 * server. `ElementInternals.labels` holds only `<label>` elements, which the cast states.
 */
export function hostLabelIds(owner: LabelledHost): string[] {
	const labels = owner.labels as NodeListOf<HTMLLabelElement> | undefined;
	if (!labels) {
		return [];
	}
	return Array.from(labels, (label) => {
		if (!label.id) {
			label.id = uniqueId('rui-host-label');
		}
		return label.id;
	});
}

/**
 * Names inner parts with a host's own labels, for a host with no composed control to hand to
 * {@link syncFieldLabel}: a slider thumb, a knob, a date group.
 *
 * @remarks A part that carries its own `aria-label` (a range thumb's minimum or maximum) keeps
 * naming itself by listing its own id after the labels, so the labels add to its name instead of
 * replacing it. Hosts add no role or ARIA state of their own, which would duplicate the part's.
 */
export function forwardHostLabels(owner: LabelledHost, targets: Iterable<HTMLElement>): void {
	const ids = hostLabelIds(owner);
	if (ids.length === 0) {
		return;
	}
	for (const target of targets) {
		const names = target.hasAttribute('aria-label')
			? [...ids, target.id || (target.id = uniqueId('rui-label-target'))]
			: ids;
		target.setAttribute('aria-labelledby', names.join(' '));
	}
}

/** Points a visible label at a composed control and prefers it over `aria-label`. */
export function bindVisibleLabel(
	label: HTMLLabelElement,
	control: HTMLElement,
	options: { controlId: string; labelId: string; extraLabelIds?: readonly string[] },
): void {
	if (!label.id) {
		label.id = options.labelId;
	}
	if (!label.htmlFor) {
		label.htmlFor = options.controlId;
	}
	control.setAttribute('aria-labelledby', [label.id, ...(options.extraLabelIds ?? [])].join(' '));
	control.removeAttribute('aria-label');
}

/**
 * Applies the shared label-to-control ARIA contract: binds the visible or host label to an unmanaged control, and on
 * a field-managed control only drops its own `aria-label` fallback once the target has `aria-labelledby`.
 *
 * @remarks A control marked field-managed is not relabelled: whoever painted its ARIA (the field, or a registered
 * host through `fieldAria` / `fieldAriaBindings`) owns its labelling. The lookup below searches beside `owner`, so
 * for a control nested in a host it cannot find the field's label and would strip the painted `aria-labelledby`.
 * Dropping the `aria-label` (a `label` prop fallback) matches the field's own paint, so no stale name stays beside
 * the painted one.
 *
 * The associated label can also be one of the host's own labels (`<label for="host-id">`
 * directly before the host), so its id is left out of the extra host ids to name the control by
 * each label once.
 */
export function syncFieldLabel(owner: LabelledHost, control: HTMLElement | null, options: FieldLabelSyncOptions): void {
	if (!control) {
		return;
	}
	if (control.hasAttribute(RUI_FIELD_MANAGED_ATTR)) {
		if (control.hasAttribute('aria-labelledby')) {
			control.removeAttribute('aria-label');
		}
		return;
	}

	const hostIds = hostLabelIds(owner);
	const labelElement = findAssociatedLabel(owner);
	if (labelElement) {
		const extraLabelIds = hostIds.filter((id) => id !== labelElement.id);
		bindVisibleLabel(labelElement, control, { ...options, extraLabelIds });
		return;
	}

	if (hostIds.length > 0) {
		control.setAttribute('aria-labelledby', hostIds.join(' '));
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
