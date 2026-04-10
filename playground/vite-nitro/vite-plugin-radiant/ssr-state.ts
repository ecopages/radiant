import { createMarkupNodeLike, type JsxRenderable } from '@ecopages/jsx';
import { escapeScriptJson } from '@ecopages/radiant/tools/escape-script-json';
import { stringifyTyped } from '@ecopages/radiant/tools/stringify-typed';

/** Serializes any state object to a JSON string suitable for SSR embedding. */
export function serializeSsrState<T>(state: T): string {
	return stringifyTyped<T, string>(state);
}

/** Parses a JSON string back into a typed state object. Returns `undefined` on missing or malformed input. */
export function parseSsrState<T>(raw?: string | null): T | undefined {
	if (!raw) {
		return undefined;
	}

	try {
		return JSON.parse(raw) as T;
	} catch {
		return undefined;
	}
}

/** Creates a `<script type="application/json">` node with the given attribute marker and serialized content. */
export function createSsrStateScriptNode(serialized: string, attribute: string): JsxRenderable {
	return createMarkupNodeLike(
		`<script type="application/json" ${attribute}>${escapeScriptJson(serialized)}</script>`,
	);
}

/** Reads and parses an SSR state payload from a `<script>` tag identified by the given attribute. */
export function readSsrStateFromDom<T>(
	attribute: string,
	root: ParentNode = document,
): { raw: string; state: T } | undefined {
	const raw = root.querySelector<HTMLScriptElement>(`script[${attribute}]`)?.textContent;
	const state = parseSsrState<T>(raw);

	if (!raw || !state) {
		return undefined;
	}

	return { raw, state };
}
