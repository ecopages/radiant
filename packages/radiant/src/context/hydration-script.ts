import {
	createHydrationScriptTag,
	escapeHydrationJson,
	HYDRATION_ATTRIBUTE,
	HYDRATION_KEY_ATTRIBUTE,
} from '../core/hydration-codec';

/** @deprecated Use `HYDRATION_ATTRIBUTE` from `hydration-codec` instead. */
export const CONTEXT_HYDRATION_ATTRIBUTE = HYDRATION_ATTRIBUTE;
/** @deprecated Use `HYDRATION_KEY_ATTRIBUTE` from `hydration-codec` instead. */
export const CONTEXT_HYDRATION_KEY_ATTRIBUTE = HYDRATION_KEY_ATTRIBUTE;

/**
 * Creates the raw `<script type="application/json">` tag used to hydrate a
 * serialized context provider.
 */
export function createContextHydrationScriptTag(options: { hydrationKey?: string; serializedValue: string }): string {
	return createHydrationScriptTag({ type: 'context', ...options });
}

/**
 * Escapes serialized JSON so it remains safe when embedded inside an HTML
 * script tag.
 */
export function escapeContextHydrationJson(value: string): string {
	return escapeHydrationJson(value);
}
