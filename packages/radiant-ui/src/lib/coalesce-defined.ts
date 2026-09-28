/**
 * Returns the first argument that is not `undefined`.
 *
 * @remarks `null` is a supplied value (remove / empty) and therefore wins.
 */
export function coalesceDefined<Value>(...values: Array<Value | undefined>): Value | undefined {
	for (const value of values) {
		if (value !== undefined) {
			return value;
		}
	}
}
