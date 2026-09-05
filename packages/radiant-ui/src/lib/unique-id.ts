/**
 * CSS identifier: starts with a letter so `#id` and `querySelector` stay valid.
 *
 * @remarks HTML5 allows a leading digit; CSS and Stimulus do not.
 */
const CSS_SAFE_ID = /^[A-Za-z][A-Za-z0-9_-]*$/;

/**
 * Whether `value` is safe as a CSS id selector (`#value`) without escaping.
 */
export function isCssSafeId(value: string): boolean {
	return CSS_SAFE_ID.test(value);
}

function cssSafePrefix(prefix: string): string {
	const trimmed = prefix.trim();
	if (isCssSafeId(trimmed)) {
		return trimmed;
	}

	const prefixed = `rui-${trimmed}`;
	if (trimmed && isCssSafeId(prefixed)) {
		return prefixed;
	}

	return 'rui';
}

/**
 * Mint a document-unique, CSS-safe id: `${prefix}-${uuid}`.
 *
 * @remarks Uses `crypto.randomUUID()` in secure contexts and random bytes on HTTP.
 * Prefix so the id never starts with a digit.
 */
export function uniqueId(prefix: string): string {
	const token =
		typeof crypto.randomUUID === 'function'
			? crypto.randomUUID().replace(/-/g, '')
			: Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join(
					'',
				);
	return `${cssSafePrefix(prefix)}-${token}`;
}
