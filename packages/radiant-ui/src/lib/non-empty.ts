/**
 * Returns `value` when it is non-empty, otherwise `undefined`.
 *
 * @remarks Used by `@bindTo` maps that omit an attribute when the field is `''`.
 */
export function nonEmpty(value: string): string | undefined {
	return value || undefined;
}
