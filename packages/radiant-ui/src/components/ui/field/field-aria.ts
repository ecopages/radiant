import { getDeclaredAriaTargets, isNativeTextControl, RUI_FIELD_MANAGED_ATTR } from '../form/control-protocol';
import type { FieldContextValue } from './field-context';

/** Targets whose `aria-disabled` (and native `disabled`) came from the field, so re-enabling only undoes that. */
const disabledByField = new WeakSet<HTMLElement>();

/**
 * Paints the field's ARIA state onto the ARIA targets a custom control host declares.
 *
 * Call it from the host's `updated()` with the latest {@link fieldContext} value, so the state lands whenever
 * the target renders and again whenever the field changes. It writes `id` when the target has none,
 * `aria-labelledby`, `aria-describedby`, `aria-invalid`, `aria-required` and `aria-disabled`, and points the
 * label's `htmlFor` at the first target.
 *
 * @remarks `RuiField` does not write these onto a host registered with `registerFieldControl` that declares
 * `data-rui-aria-target(s)`, because that target usually does not exist when the field connects. Does nothing
 * until the field has published, or while no declared target is rendered.
 */
export function applyFieldAria(host: HTMLElement, field: FieldContextValue | undefined): void {
	if (!field?.controlId) {
		return;
	}

	for (const [index, target] of getDeclaredAriaTargets(host).entries()) {
		if (!target.id) {
			target.id = index === 0 ? field.controlId : `${field.controlId}-${index}`;
		}
		target.setAttribute(RUI_FIELD_MANAGED_ATTR, '');
		target.setAttribute('aria-invalid', String(field.invalid));
		if (field.required) target.setAttribute('aria-required', 'true');
		else target.removeAttribute('aria-required');
		if (field.describedBy) target.setAttribute('aria-describedby', field.describedBy);
		else target.removeAttribute('aria-describedby');
		paintLabel(host, target, field, index);
		paintDisabled(target, field.disabled);
	}
}

function paintLabel(host: HTMLElement, target: HTMLElement, field: FieldContextValue, index: number): void {
	if (!field.labelId) {
		return;
	}
	target.setAttribute('aria-labelledby', field.labelId);
	target.removeAttribute('aria-label');
	if (index === 0) {
		const root = host.getRootNode();
		const label = 'getElementById' in root ? (root as Document | ShadowRoot).getElementById(field.labelId) : null;
		if (label instanceof HTMLLabelElement) {
			label.htmlFor = target.id;
		}
	}
}

function paintDisabled(target: HTMLElement, disabled: boolean): void {
	if (disabled) {
		disabledByField.add(target);
		target.setAttribute('aria-disabled', 'true');
		if (isNativeTextControl(target)) target.disabled = true;
		return;
	}
	if (disabledByField.delete(target)) {
		target.removeAttribute('aria-disabled');
		if (isNativeTextControl(target)) target.disabled = false;
	}
}
