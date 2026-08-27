/** Parses the comma-separated value protocol used by multi-select controls. */
export function parseMultiValue(value: string | null | undefined): string[] {
	if (!value) {
		return [];
	}
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

/** Serializes multi-select values into the public custom-element value protocol. */
export function serializeMultiValue(values: string[]): string {
	return values.join(',');
}
