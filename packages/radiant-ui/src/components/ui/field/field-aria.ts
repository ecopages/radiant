import type { BindToTarget } from '@ecopages/radiant';
import type { FieldContextValue } from './field-context';

/** The ARIA attributes a field publishes for a custom control's target. */
export type FieldAria = {
	'aria-labelledby'?: string;
	'aria-describedby'?: string;
	'aria-invalid'?: 'true' | 'false';
	'aria-required'?: 'true';
	'aria-disabled'?: 'true';
};

/**
 * The ARIA attributes a field publishes for a custom control's target, as an attribute map.
 *
 * For a host that owns a `render()` tree: read the `fieldContext` value in a `@contextSelector` field and
 * spread this on the target, so Radiant repaints it whenever the target renders or the field changes.
 * An attribute the field has no value for is absent from the map.
 *
 * @remarks Returns an empty map until the field has published its first state.
 */
export function fieldAria(field: FieldContextValue | undefined): FieldAria {
	if (!field?.controlId) {
		return {};
	}
	return {
		...(field.labelId ? { 'aria-labelledby': field.labelId } : {}),
		...(field.describedBy ? { 'aria-describedby': field.describedBy } : {}),
		'aria-invalid': field.invalid ? 'true' : 'false',
		...(field.required ? { 'aria-required': 'true' as const } : {}),
		...(field.disabled ? { 'aria-disabled': 'true' as const } : {}),
	};
}

/**
 * `@bindTo` targets that copy {@link fieldAria} onto the element matching `selector`.
 *
 * For a host that keeps authored DOM (no `render()`): decorate the `@state` field that holds the
 * `fieldContext` value with `@bindTo(fieldAriaBindings('input'))`. An attribute without a value is removed.
 */
export function fieldAriaBindings(selector: string): BindToTarget<FieldContextValue | undefined>[] {
	const attributes = [
		'aria-labelledby',
		'aria-describedby',
		'aria-invalid',
		'aria-required',
		'aria-disabled',
	] as const;
	return attributes.map((attr) => ({ selector, attr, map: (field) => fieldAria(field)[attr] }));
}
