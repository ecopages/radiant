/** Splits a comma-separated attribute into trimmed non-empty tokens. */
export function parseCommaSeparated(value: string): string[] {
	return value
		.split(',')
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
}
