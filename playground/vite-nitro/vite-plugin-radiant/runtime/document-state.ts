import { createMarkupNodeLike, type JsxRenderable } from '@ecopages/jsx';
import { escapeScriptJson } from '@ecopages/radiant/tools/escape-script-json';
import { stringifyTyped } from '@ecopages/radiant/tools/stringify-typed';
import type { RenderedComponentAsset } from '@ecopages/radiant/server/render-component';

export const RADIANT_DOCUMENT_STATE_SCRIPT_ID = 'radiant-document-state';

export type RadiantDocumentUsage = {
	controllerIdentifiers: readonly string[];
	customElementTagNames: readonly string[];
};

export type RadiantDocumentState = {
	assets: readonly RenderedComponentAsset[];
	generatedAt: string;
	usage: RadiantDocumentUsage;
};

export function createRadiantDocumentStateScriptMarkup(state: RadiantDocumentState): string {
	return `<script type="application/json" id="${RADIANT_DOCUMENT_STATE_SCRIPT_ID}">${escapeScriptJson(serializeRadiantDocumentState(state))}</script>`;
}

export function createRadiantDocumentStateScriptNode(state: RadiantDocumentState): JsxRenderable {
	return createMarkupNodeLike(createRadiantDocumentStateScriptMarkup(state));
}

export function hasRadiantDocumentState(state: RadiantDocumentState): boolean {
	return (
		state.assets.length > 0 ||
		state.usage.controllerIdentifiers.length > 0 ||
		state.usage.customElementTagNames.length > 0
	);
}

export function serializeRadiantDocumentState(state: RadiantDocumentState): string {
	return stringifyTyped<RadiantDocumentState, string>(state);
}

export function readRadiantDocumentStateFromDom(root: ParentNode = document) {
	const raw = root.querySelector<HTMLScriptElement>(
		`script#${CSS.escape(RADIANT_DOCUMENT_STATE_SCRIPT_ID)}`,
	)?.textContent;

	if (!raw) {
		return undefined;
	}

	try {
		return {
			raw,
			state: JSON.parse(raw) as RadiantDocumentState,
		};
	} catch {
		return undefined;
	}
}
