import { escapeScriptJson } from '../tools/escape-script-json';

/** Attribute marker used to identify signal hydration payloads inside a host. */
export const SIGNAL_HYDRATION_ATTRIBUTE = 'data-signal-hydration';
/** Optional key that scopes a signal hydration payload to a specific decorated field. */
export const SIGNAL_HYDRATION_KEY_ATTRIBUTE = 'data-signal-key';

/** Creates the raw `<script type="application/json">` tag used to hydrate a signal field. */
export function createSignalHydrationScriptTag(options: { hydrationKey?: string; serializedValue: string }): string {
	const hydrationKeyAttribute = options.hydrationKey
		? ` ${SIGNAL_HYDRATION_KEY_ATTRIBUTE}="${escapeHtmlAttribute(options.hydrationKey)}"`
		: '';

	return `<script type="application/json" ${SIGNAL_HYDRATION_ATTRIBUTE}${hydrationKeyAttribute}>${options.serializedValue}</script>`;
}

/** Escapes serialized JSON so it remains safe inside an HTML script tag. */
export function escapeSignalHydrationJson(value: string): string {
	return escapeScriptJson(value);
}

function escapeHtmlAttribute(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
