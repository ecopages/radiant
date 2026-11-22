/**
 * Structural equality for control values; at the top level `null` and `undefined`
 * both mean "no value".
 *
 * @remarks Inside arrays and objects the two differ and a missing key differs from
 * a key holding `null`. Dates compare by time. Any other non-plain object compares
 * by identity, so it is rewritten rather than wrongly treated as equal.
 */
export function isSameValue(a: unknown, b: unknown): boolean {
	return (a == null && b == null) || isSameNested(a, b);
}

function isSameNested(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) {
		return true;
	}
	if (Array.isArray(a) || Array.isArray(b)) {
		return (
			Array.isArray(a) &&
			Array.isArray(b) &&
			a.length === b.length &&
			a.every((item, i) => isSameNested(item, b[i]))
		);
	}
	if (a instanceof Date || b instanceof Date) {
		return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
	}
	return isSameRecord(a, b);
}

function isSameRecord(a: unknown, b: unknown): boolean {
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
		return false;
	}
	if (!isPlainObject(a) || !isPlainObject(b)) {
		return false;
	}
	const keys = Object.keys(a);
	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => Object.hasOwn(b, key) && isSameNested(Reflect.get(a, key), Reflect.get(b, key)))
	);
}

function isPlainObject(value: object): boolean {
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}
