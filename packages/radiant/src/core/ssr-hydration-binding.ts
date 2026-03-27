import type { JsxRenderable } from '@ecopages/jsx';

/**
 * Serializable host-level hydration payload that can be appended to SSR output.
 *
 * Context providers and other host-owned reactive primitives use this contract
 * to surface keyed `<script type="application/json">` payloads that the client
 * can recover during hydration.
 */
export interface SsrSerializableHydrationBinding {
	/** Returns the hydration script as JSX-friendly serialized markup, when available. */
	renderHydrationScript(): JsxRenderable | undefined;
	/** Returns the hydration script as a raw HTML string, when available. */
	renderHydrationScriptTag(): string | undefined;
}
