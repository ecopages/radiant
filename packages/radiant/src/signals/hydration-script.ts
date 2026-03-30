import {
	createHydrationScriptTag,
	escapeHydrationJson,
	HYDRATION_ATTRIBUTE,
	HYDRATION_KEY_ATTRIBUTE,
} from '../core/hydration-codec';

/** @deprecated Use `HYDRATION_ATTRIBUTE` from `hydration-codec` instead. */
export const SIGNAL_HYDRATION_ATTRIBUTE = HYDRATION_ATTRIBUTE;
/** @deprecated Use `HYDRATION_KEY_ATTRIBUTE` from `hydration-codec` instead. */
export const SIGNAL_HYDRATION_KEY_ATTRIBUTE = HYDRATION_KEY_ATTRIBUTE;

/** Creates the raw `<script type="application/json">` tag used to hydrate a signal field. */
export function createSignalHydrationScriptTag(options: { hydrationKey?: string; serializedValue: string }): string {
	return createHydrationScriptTag({ type: 'signal', ...options });
}

/** Escapes serialized JSON so it remains safe inside an HTML script tag. */
export function escapeSignalHydrationJson(value: string): string {
	return escapeHydrationJson(value);
}
