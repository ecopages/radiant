/**
 * @remarks A hyphenated tag is a custom-element subtree root. Nested roots never
 * take hydration marker indexes from the parent namespace, registered or not.
 * An unregistered nested tag serializes as plain markup; a registered host may
 * fork its own namespace.
 */
export function isCustomElementSubtreeRoot(localName: string): boolean {
	return localName.includes('-');
}
