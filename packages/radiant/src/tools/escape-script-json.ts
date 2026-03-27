/**
 * Escapes serialized JSON so it remains safe when embedded inside an HTML
 * `<script>` tag.
 */
export function escapeScriptJson(value: string): string {
	return value
		.replace(/&/g, '\\u0026')
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}