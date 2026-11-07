import { createMarkupNodeLike, isKeyedJsxValue, type JsxRenderable, type TemplateResultLike } from '@ecopages/jsx';

import { escapeHtmlText } from '../utils/escape-html-text';
import { HYDRATION_ATTRIBUTE } from './hydration-codec';

export const SLOTTED_PAYLOAD_SCRIPT_ATTRIBUTE = 'data-radiant-slot-projection';

type ForeignNamespace = 'svg' | 'math';

/**
 * Replaces slotted content that a view places inside `svg` or `math`.
 *
 * @remarks The server passes one to {@link projectForeignSlotted}: a light-DOM node would otherwise serialize by its
 * own DOM position, under the host in HTML, while the browser parses it where the view puts it.
 */
export type ForeignSlottedProjector = (content: JsxRenderable, namespace: ForeignNamespace) => JsxRenderable;

/** A host's child nodes as slotted content, without the hydration and payload scripts the server adds. */
export function captureSlottedNodes(host: HTMLElement): Node[] {
	return Array.from(host.childNodes).filter((node) => !isPayloadScript(node) && !isHydrationScript(node));
}

/** Removes the server's slotted payload script from `host` and returns its text. */
export function takeSlottedPayload(host: HTMLElement): string | undefined {
	for (const node of Array.from(host.childNodes)) {
		if (!isPayloadScript(node)) continue;
		const payload = node.textContent ?? undefined;
		node.parentNode?.removeChild(node);
		return payload;
	}

	return undefined;
}

/** Reads a slotted payload into markup nodes the client renders as they are. */
export function deserializeSlottedPayload(payload: string): JsxRenderable[] {
	try {
		const fragments = (JSON.parse(payload) as Record<string, unknown>)[''];
		return Array.isArray(fragments) ? fragments.map((fragment) => createMarkupNodeLike(String(fragment))) : [];
	} catch {
		if (typeof console !== 'undefined') {
			console.warn('[@ecopages/radiant] Failed to parse slotted payload:', payload.slice(0, 120));
		}
		return [];
	}
}

/** The payload that carries captured slotted nodes to the client, or `undefined` when there are none. */
export function serializeSlottedPayload(nodes: readonly JsxRenderable[]): Record<string, string[]> | undefined {
	const fragments = nodes
		.map((node) => renderableToHtmlFragment(node))
		.filter((fragment): fragment is string => fragment !== undefined && fragment !== '');

	return fragments.length > 0 ? { '': fragments } : undefined;
}

/** JSON script the client reads to restore captured slotted nodes. */
export function createSlottedPayloadScriptTag(payload: Record<string, string[]>): string {
	return `<script type="application/json" ${SLOTTED_PAYLOAD_SCRIPT_ATTRIBUTE}>${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>`;
}

export function collectAuthoredHydrationScriptMarkup(host: HTMLElement): string | undefined {
	const fragments = Array.from(host.childNodes)
		.filter((node): node is HTMLScriptElement => isHydrationScript(node))
		.map((node) => renderableToHtmlFragment(node) ?? '')
		.filter((fragment) => fragment !== '');

	return fragments.length > 0 ? fragments.join('') : undefined;
}

/**
 * Passes each entry of `slotted` through `project` wherever `value` places it inside `svg` or `math`.
 *
 * @remarks Server only. Entries are found by identity: the JSX factory copies an array child, so the slotted array
 * itself does not survive, while its entries, and a single slotted value, do. Namespaces are tracked through
 * templates by the rule of the jsx serializer's `childForeignContent`.
 */
export function projectForeignSlotted(
	value: JsxRenderable,
	slotted: JsxRenderable,
	project: ForeignSlottedProjector,
): JsxRenderable {
	if (slotted === null || slotted === undefined) return value;

	const entries = new Set<unknown>(Array.isArray(slotted) ? [slotted, ...slotted] : [slotted]);

	const walk = (current: JsxRenderable, namespace?: ForeignNamespace): JsxRenderable => {
		if (entries.has(current)) return namespace ? project(current, namespace) : current;
		if (isKeyedJsxValue(current)) return { ...current, value: walk(current.value, namespace) };

		if (isTemplateResultLike(current)) {
			const childNamespace = childForeignNamespace(current.rootLocalName?.toLowerCase(), namespace);
			return {
				...current,
				values: current.values.map((entry) => walk(entry as JsxRenderable, childNamespace)),
			} satisfies TemplateResultLike;
		}

		if (Array.isArray(current)) return current.map((entry: JsxRenderable) => walk(entry, namespace));
		return current;
	};

	return walk(value);
}

function isTemplateResultLike(value: JsxRenderable): value is TemplateResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Partial<TemplateResultLike>)['_$rType$'] === 1 &&
		Array.isArray((value as Partial<TemplateResultLike>).values)
	);
}

/**
 * @remarks `svg` and `math` enter foreign content. Only an SVG `foreignObject`, `desc` or `title` returns to HTML;
 * under `math` the same names stay foreign.
 */
function childForeignNamespace(
	localName: string | undefined,
	namespace?: ForeignNamespace,
): ForeignNamespace | undefined {
	if (localName === 'svg' || localName === 'math') return localName;
	return namespace === 'svg' && (localName === 'foreignobject' || localName === 'desc' || localName === 'title')
		? undefined
		: namespace;
}

function isPayloadScript(node: Node): node is HTMLScriptElement {
	return node instanceof HTMLScriptElement && node.hasAttribute(SLOTTED_PAYLOAD_SCRIPT_ATTRIBUTE);
}

function isHydrationScript(node: Node): node is HTMLScriptElement {
	return node instanceof HTMLScriptElement && node.hasAttribute(HYDRATION_ATTRIBUTE);
}

/**
 * @remarks Comment nodes render nothing: the payload becomes trusted markup on the client, and comment data is not
 * escaped by serialization.
 */
function renderableToHtmlFragment(renderable: JsxRenderable): string | undefined {
	if (renderable === undefined || renderable === null || renderable === false || renderable === true)
		return undefined;
	if (typeof renderable === 'string' || typeof renderable === 'number' || typeof renderable === 'bigint') {
		return String(renderable);
	}

	if (typeof Node !== 'undefined' && renderable instanceof Node) {
		if (renderable.nodeType === Node.TEXT_NODE) return escapeHtmlText(renderable.textContent ?? '');
		if (renderable.nodeType === Node.COMMENT_NODE) return '';
		return (renderable as Element).outerHTML ?? renderable.textContent ?? undefined;
	}

	if (isKeyedJsxValue(renderable)) return renderableToHtmlFragment(renderable.value);

	if (typeof renderable === 'object' && 'outerHTML' in renderable) {
		const outerHTML = (renderable as { outerHTML: unknown }).outerHTML;
		return typeof outerHTML === 'string' ? outerHTML : undefined;
	}

	if (typeof renderable === 'object' && Symbol.iterator in renderable) {
		return Array.from(renderable as Iterable<JsxRenderable>, (entry) => renderableToHtmlFragment(entry) ?? '').join(
			'',
		);
	}

	return undefined;
}
