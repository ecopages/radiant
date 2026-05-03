import { createHydrationScriptTag, escapeHydrationJson } from '../core/hydration-codec';

/** Creates the raw `<script type="application/json">` tag used to hydrate a signal field. */
export function createSignalHydrationScriptTag(options: { hydrationKey?: string; serializedValue: string }): string {
	return createHydrationScriptTag({ type: 'signal', ...options });
}

/** Escapes serialized JSON so it remains safe inside an HTML script tag. */
export function escapeSignalHydrationJson(value: string): string {
	return escapeHydrationJson(value);
}
