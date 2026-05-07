import { createMarkupNodeLike, type JsxRenderable } from '@ecopages/jsx';
import { escapeScriptJson } from '@ecopages/radiant/tools/escape-script-json';
import { escapeCssIdentifier } from './escape-css-identifier';

export function serializeSsrState<T>(state: T): string {
	return JSON.stringify(state);
}

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

export function createSsrStateScriptNode(serialized: string, id: string): JsxRenderable {
	return createMarkupNodeLike(`<script type="application/json" id="${id}">${escapeScriptJson(serialized)}</script>`);
}

export function readSsrStateFromDom<T>(id: string, root: ParentNode = document): { raw: string; state: T } | undefined {
	const raw = root.querySelector<HTMLScriptElement>(`script#${escapeCssIdentifier(id)}`)?.textContent;
	const state = parseSsrState<T>(raw);

	if (!raw || !state) {
		return undefined;
	}

	return { raw, state };
}
