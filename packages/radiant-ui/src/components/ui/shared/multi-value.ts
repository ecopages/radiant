import type { PropTransform, ReactivePropertyOptions } from '@ecopages/radiant';

/** Parses the comma-separated value protocol used by multi-select controls. */
export function parseMultiValue(value: string | null | undefined): string[] {
	if (!value) {
		return [];
	}
	return uniqueTrimmed(value.split(','));
}

/** Serializes multi-select values into the public custom-element value protocol. */
export function serializeMultiValue(values: readonly string[]): string {
	return values.join(',');
}

/** `@prop` transform for comma-separated multi-value host attributes. */
export const multiValueTransform: PropTransform<string[]> = {
	fromAttribute: (value) => parseMultiValue(value),
	toAttribute: (values) => (values.length > 0 ? serializeMultiValue(values) : null),
	fromProperty: (value) => {
		if (Array.isArray(value)) {
			return uniqueTrimmed(value.map(String));
		}
		if (typeof value === 'string') {
			return parseMultiValue(value);
		}
		return [];
	},
};

/** Shared `@prop` options for comma-separated `string[]` host values. */
export const multiValuePropOptions = {
	type: Array,
	reflect: true,
	transform: multiValueTransform,
} as const satisfies Pick<ReactivePropertyOptions<string[]>, 'type' | 'reflect' | 'transform'>;

/**
 * JSX / view `value` accepted by listbox, select, combobox, checkbox-group,
 * tag-group, and table. The live host property is always `string[]`.
 */
export type ViewMultiValue = string | readonly string[] | undefined;

/** Reads a view `value` as the selected-token array for SSR of selected children. */
export function parseViewValue(value: ViewMultiValue): string[] {
	return multiValueTransform.fromProperty?.(value) ?? [];
}

function parseNumberArray(value: string | null | undefined): number[] {
	if (!value) {
		return [];
	}
	return value
		.split(',')
		.map((item) => Number(item.trim()))
		.filter((item) => Number.isFinite(item));
}

function serializeNumberArray(values: readonly number[]): string {
	return values.join(',');
}

/** `@prop` transform for comma-separated numeric host attributes (e.g. slider). */
export const numberArrayTransform: PropTransform<number[]> = {
	fromAttribute: (value) => parseNumberArray(value),
	toAttribute: (values) => (values.length > 0 ? serializeNumberArray(values) : null),
	fromProperty: (value) => {
		if (Array.isArray(value)) {
			return value.map(Number).filter((item) => Number.isFinite(item));
		}
		if (typeof value === 'number' && Number.isFinite(value)) {
			return [value];
		}
		if (typeof value === 'string') {
			return parseNumberArray(value);
		}
		return [];
	},
};

/**
 * JSX / view `value` accepted by slider. The live host property is always `number[]`.
 */
export type ViewNumericValue = number | readonly number[] | undefined;

function uniqueTrimmed(values: readonly string[]): string[] {
	return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}
