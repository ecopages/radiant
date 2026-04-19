import { createHydrationScriptTag, escapeHydrationJson } from '../core/hydration-codec';

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
