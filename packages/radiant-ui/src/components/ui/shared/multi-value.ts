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

/**
 * View-level `value` accepted by listbox, select, combobox, and checkbox-group.
 *
 * @remarks The host attribute is always a comma-separated string. JSX may pass
 * a string or a `string[]`; commas in the host attribute are delimiters, not
 * literal characters inside a token.
 */
export type ViewMultiValue = string | readonly string[] | undefined;

/** Converts a view `value` into the host attribute protocol. */
export function serializeViewValue(value: ViewMultiValue): string | undefined {
	if (value == null) {
		return undefined;
	}
	if (typeof value !== 'string') {
		return serializeMultiValue(uniqueTrimmed(value));
	}
	return value;
}

/** Reads a view `value` as the selected-token array. */
export function parseViewValue(value: ViewMultiValue): string[] {
	if (value == null) {
		return [];
	}
	if (typeof value !== 'string') {
		return uniqueTrimmed(value);
	}
	return parseMultiValue(value);
}

function uniqueTrimmed(values: readonly string[]): string[] {
	return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}
