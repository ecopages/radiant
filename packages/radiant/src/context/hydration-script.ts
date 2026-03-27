import { escapeScriptJson } from '../tools/escape-script-json';

/** Attribute marker used to identify context hydration scripts inside a host. */
export const CONTEXT_HYDRATION_ATTRIBUTE = 'data-hydration';
/** Optional key that scopes a hydration payload to a specific provider property. */
export const CONTEXT_HYDRATION_KEY_ATTRIBUTE = 'data-context-key';

/**
 * Creates the raw `<script type="application/json">` tag used to hydrate a
 * serialized context provider.
 */
export function createContextHydrationScriptTag(options: { hydrationKey?: string; serializedValue: string }): string {
	const hydrationKeyAttribute = options.hydrationKey
		? ` ${CONTEXT_HYDRATION_KEY_ATTRIBUTE}="${escapeHtmlAttribute(options.hydrationKey)}"`
		: '';

	return `<script type="application/json" ${CONTEXT_HYDRATION_ATTRIBUTE}${hydrationKeyAttribute}>${options.serializedValue}</script>`;
}

/**
 * Escapes serialized JSON so it remains safe when embedded inside an HTML
 * script tag.
 */
export function escapeContextHydrationJson(value: string): string {
	return escapeScriptJson(value);
}

function escapeHtmlAttribute(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
