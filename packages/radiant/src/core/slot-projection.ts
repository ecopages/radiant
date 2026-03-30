import {
	createMarkupNodeLike,
	isKeyedJsxValue,
	isSlotJsxValue,
	type JsxRenderable,
	type KeyedJsxValue,
	type SlotJsxValue,
	type TemplateResultLike,
} from '@ecopages/jsx';

import { HYDRATION_ATTRIBUTE } from './hydration-codec';

export const DEFAULT_SLOT_NAME = '';
export const SLOT_PROJECTION_SCRIPT_ATTRIBUTE = 'data-radiant-slot-projection';

type ResolvedSlotProjection = {
	containsSlots: boolean;
	value: JsxRenderable;
};

/**
 * Captures direct host children as projected slot content for client rendering.
 */
export function captureProjectedSlotRenderables(host: HTMLElement): Map<string, JsxRenderable[]> {
	const projectedContent = new Map<string, JsxRenderable[]>();

	for (const node of Array.from(host.childNodes)) {
		if (isIgnoredProjectedNode(node)) {
			continue;
		}

		appendProjectedRenderable(projectedContent, getNodeSlotName(node), node);
	}

	return projectedContent;
}

/**
 * Parses the SSR slot projection payload back into renderable fragments.
 */
export function deserializeProjectedSlotRenderables(payload: string): Map<string, JsxRenderable[]> {
	let parsedPayload: Record<string, string[]>;

	try {
		parsedPayload = JSON.parse(payload) as Record<string, string[]>;
	} catch {
		if (typeof console !== 'undefined') {
			console.warn('[@ecopages/radiant] Failed to parse slot projection payload:', payload.slice(0, 120));
		}
		return new Map();
	}

	const projectedContent = new Map<string, JsxRenderable[]>();

	for (const [slotName, fragments] of Object.entries(parsedPayload)) {
		if (!Array.isArray(fragments) || fragments.length === 0) {
			continue;
		}

		projectedContent.set(
			normalizeSlotName(slotName),
			fragments.map((fragment) => createMarkupNodeLike(fragment)),
		);
	}

	return projectedContent;
}

/**
 * Parses serialized child HTML into slot buckets for SSR-driven projection.
 */
export function parseProjectedSlotRenderablesFromHtml(html: string): Map<string, JsxRenderable[]> {
	const projectedContent = new Map<string, JsxRenderable[]>();

	for (const fragment of collectTopLevelHtmlFragments(html)) {
		if (isIgnoredProjectedHtmlFragment(fragment)) {
			continue;
		}

		appendProjectedRenderable(
			projectedContent,
			getSlotNameFromHtmlFragment(fragment),
			createMarkupNodeLike(fragment),
		);
	}

	return projectedContent;
}

export function collectAuthoredHydrationScriptMarkup(host: HTMLElement): string | undefined {
	const fragments = Array.from(host.childNodes)
		.filter((node): node is HTMLScriptElement => isHydrationScriptNode(node))
		.map((node) => renderableToHtmlFragment(node) ?? '')
		.filter((fragment) => fragment !== '');

	return fragments.length > 0 ? fragments.join('') : undefined;
}

export function collectAuthoredHydrationScriptMarkupFromHtml(html: string): string | undefined {
	const fragments = collectTopLevelHtmlFragments(html).filter((fragment) => isHydrationScriptHtmlFragment(fragment));

	return fragments.length > 0 ? fragments.join('') : undefined;
}

/**
 * Serializes the current slot assignments into the payload embedded in SSR host output.
 */
export function serializeProjectedSlotRenderables(
	projectedContent: ReadonlyMap<string, readonly JsxRenderable[]>,
): string | undefined {
	const payload: Record<string, string[]> = {};

	for (const [slotName, renderables] of projectedContent.entries()) {
		const fragments = renderables
			.map((renderable) => renderableToHtmlFragment(renderable))
			.filter((fragment): fragment is string => fragment !== undefined && fragment !== '');

		if (fragments.length > 0) {
			payload[slotName] = fragments;
		}
	}

	return Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined;
}

/**
 * Resolves literal `<slot>` placeholders inside a JSX tree.
 */
export function resolveSlotProjection(
	value: JsxRenderable,
	projectedContent: ReadonlyMap<string, readonly JsxRenderable[]>,
): ResolvedSlotProjection {
	let containsSlots = false;

	const resolveValue = (currentValue: JsxRenderable): JsxRenderable => {
		if (isSlotJsxValue(currentValue)) {
			containsSlots = true;
			return resolveSlotValue(currentValue, projectedContent, resolveValue);
		}

		if (isKeyedJsxValue(currentValue)) {
			return cloneKeyedJsxValue(currentValue, resolveValue(currentValue.value));
		}

		if (isTemplateResultLike(currentValue)) {
			return {
				_$rType$: 1,
				strings: currentValue.strings,
				values: currentValue.values.map((entry) => resolveValue(entry as JsxRenderable)),
			} satisfies TemplateResultLike;
		}

		if (isIterableRenderable(currentValue)) {
			return Array.from(currentValue, (entry) => resolveValue(entry as JsxRenderable));
		}

		return currentValue;
	};

	const resolvedValue = resolveValue(value);

	return {
		containsSlots,
		value: resolvedValue,
	};
}

/**
 * Extracts and removes the SSR slot projection script from the host when present.
 */
export function takeSlotProjectionScriptPayload(host: HTMLElement): string | undefined {
	for (const node of Array.from(host.childNodes)) {
		if (!isSlotProjectionScriptNode(node)) {
			continue;
		}

		const payload = node.textContent ?? undefined;
		node.parentNode?.removeChild(node);
		return payload;
	}

	return undefined;
}

function appendProjectedRenderable(
	projectedContent: Map<string, JsxRenderable[]>,
	slotName: string,
	renderable: JsxRenderable,
): void {
	const existingRenderables = projectedContent.get(slotName);

	if (existingRenderables) {
		existingRenderables.push(renderable);
		return;
	}

	projectedContent.set(slotName, [renderable]);
}

function cloneKeyedJsxValue(value: KeyedJsxValue, nextValue: JsxRenderable): KeyedJsxValue {
	return {
		...value,
		value: nextValue,
	};
}

function collectTopLevelHtmlFragments(html: string): string[] {
	const fragments: string[] = [];
	let index = 0;

	while (index < html.length) {
		const fragmentStart = index;

		if (html.startsWith('<!--', index)) {
			const commentEnd = html.indexOf('-->', index + 4);
			index = commentEnd === -1 ? html.length : commentEnd + 3;
			fragments.push(html.slice(fragmentStart, index));
			continue;
		}

		if (html[index] !== '<') {
			const nextTagIndex = html.indexOf('<', index);
			index = nextTagIndex === -1 ? html.length : nextTagIndex;
			fragments.push(html.slice(fragmentStart, index));
			continue;
		}

		const token = parseHtmlTagToken(html, index);

		if (!token) {
			fragments.push(html.slice(fragmentStart));
			break;
		}

		if (token.type !== 'open' || token.selfClosing || voidElementNames.has(token.tagName)) {
			index = token.end;
			fragments.push(html.slice(fragmentStart, index));
			continue;
		}

		index = token.end;
		let depth = 1;

		while (index < html.length && depth > 0) {
			const nextTagIndex = html.indexOf('<', index);

			if (nextTagIndex === -1) {
				index = html.length;
				break;
			}

			const nestedToken = parseHtmlTagToken(html, nextTagIndex);

			if (!nestedToken) {
				index = html.length;
				break;
			}

			index = nestedToken.end;

			if (nestedToken.type === 'comment' || nestedToken.type === 'declaration') {
				continue;
			}

			if (nestedToken.type === 'open' && !nestedToken.selfClosing && !voidElementNames.has(nestedToken.tagName)) {
				depth += 1;
				continue;
			}

			if (nestedToken.type === 'close') {
				depth -= 1;
			}
		}

		fragments.push(html.slice(fragmentStart, index));
	}

	return fragments.filter((fragment) => fragment !== '');
}

function getNodeSlotName(node: Node): string {
	if (node instanceof Element) {
		return normalizeSlotName(node.getAttribute('slot'));
	}

	return DEFAULT_SLOT_NAME;
}

function getSlotNameFromHtmlFragment(fragment: string): string {
	const openingTagMatch = /^<([A-Za-z][^\s/>]*)([^>]*)>/s.exec(fragment);

	if (!openingTagMatch) {
		return DEFAULT_SLOT_NAME;
	}

	const attributes = openingTagMatch[2] ?? '';
	const slotMatch = /\sslot\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributes);

	return normalizeSlotName(slotMatch?.[1] ?? slotMatch?.[2] ?? slotMatch?.[3] ?? undefined);
}

function isIterableRenderable(value: JsxRenderable): value is Iterable<JsxRenderable> {
	return typeof value !== 'string' && typeof value === 'object' && value !== null && Symbol.iterator in value;
}

function isSlotProjectionScriptNode(node: Node): node is HTMLScriptElement {
	return node instanceof HTMLScriptElement && node.hasAttribute(SLOT_PROJECTION_SCRIPT_ATTRIBUTE);
}

function isHydrationScriptNode(node: Node): node is HTMLScriptElement {
	return node instanceof HTMLScriptElement && node.hasAttribute(HYDRATION_ATTRIBUTE);
}

function isIgnoredProjectedNode(node: Node): boolean {
	return isSlotProjectionScriptNode(node) || isHydrationScriptNode(node);
}

function isIgnoredProjectedHtmlFragment(fragment: string): boolean {
	return isSlotProjectionScriptHtmlFragment(fragment) || isHydrationScriptHtmlFragment(fragment);
}

function isSlotProjectionScriptHtmlFragment(fragment: string): boolean {
	const openingTagMatch = /^<script\b([^>]*)>/i.exec(fragment);

	if (!openingTagMatch) {
		return false;
	}

	return hasScriptAttribute(openingTagMatch[1] ?? '', SLOT_PROJECTION_SCRIPT_ATTRIBUTE);
}

function isHydrationScriptHtmlFragment(fragment: string): boolean {
	const openingTagMatch = /^<script\b([^>]*)>/i.exec(fragment);

	if (!openingTagMatch) {
		return false;
	}

	return hasScriptAttribute(openingTagMatch[1] ?? '', HYDRATION_ATTRIBUTE);
}

function hasScriptAttribute(attributes: string, attributeName: string): boolean {
	return new RegExp(`(?:^|\\s)${attributeName}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, 'i').test(attributes);
}

function isTemplateResultLike(value: JsxRenderable): value is TemplateResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Partial<TemplateResultLike>)['_$rType$'] === 1 &&
		Array.isArray((value as Partial<TemplateResultLike>).strings) &&
		Array.isArray((value as Partial<TemplateResultLike>).values)
	);
}

function normalizeSlotName(name: string | undefined | null): string {
	return name ?? DEFAULT_SLOT_NAME;
}

function parseHtmlTagToken(
	html: string,
	startIndex: number,
):
	| {
			end: number;
			tagName: string;
			selfClosing: boolean;
			type: 'close' | 'open';
	  }
	| {
			end: number;
			type: 'comment' | 'declaration';
	  }
	| undefined {
	if (html.startsWith('<!--', startIndex)) {
		const endIndex = html.indexOf('-->', startIndex + 4);
		return {
			end: endIndex === -1 ? html.length : endIndex + 3,
			type: 'comment',
		};
	}

	const endIndex = findHtmlTagEnd(html, startIndex);
	const rawToken = html.slice(startIndex + 1, endIndex - 1).trim();

	if (rawToken === '') {
		return undefined;
	}

	if (rawToken.startsWith('!') || rawToken.startsWith('?')) {
		return {
			end: endIndex,
			type: 'declaration',
		};
	}

	const isCloseTag = rawToken.startsWith('/');
	const tagBody = isCloseTag ? rawToken.slice(1).trim() : rawToken;
	const tagName = tagBody.split(/[\s/>]/, 1)[0]?.toLowerCase() ?? '';
	const selfClosing = !isCloseTag && /\/\s*$/.test(tagBody);

	return {
		end: endIndex,
		tagName,
		selfClosing,
		type: isCloseTag ? 'close' : 'open',
	};
}

function findHtmlTagEnd(html: string, startIndex: number): number {
	let quote: '"' | "'" | undefined;

	for (let index = startIndex + 1; index < html.length; index += 1) {
		const character = html[index];

		if (quote) {
			if (character === quote) {
				quote = undefined;
			}
			continue;
		}

		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}

		if (character === '>') {
			return index + 1;
		}
	}

	return html.length;
}

function renderableToHtmlFragment(renderable: JsxRenderable): string | undefined {
	if (renderable === undefined || renderable === null || renderable === false || renderable === true) {
		return undefined;
	}

	if (typeof Node !== 'undefined' && renderable instanceof Node) {
		if (renderable.nodeType === Node.TEXT_NODE) {
			return renderable.textContent ?? '';
		}

		return (renderable as Element).outerHTML ?? renderable.textContent ?? undefined;
	}

	if (isKeyedJsxValue(renderable)) {
		return renderableToHtmlFragment(renderable.value);
	}

	if (typeof renderable === 'string' || typeof renderable === 'number' || typeof renderable === 'bigint') {
		return String(renderable);
	}

	if (typeof renderable === 'object' && renderable !== null && 'outerHTML' in renderable) {
		return typeof renderable.outerHTML === 'string' ? renderable.outerHTML : (renderable.textContent ?? undefined);
	}

	if (isIterableRenderable(renderable)) {
		return Array.from(renderable, (entry) => renderableToHtmlFragment(entry as JsxRenderable) ?? '').join('');
	}

	return undefined;
}

function resolveSlotValue(
	value: SlotJsxValue,
	projectedContent: ReadonlyMap<string, readonly JsxRenderable[]>,
	resolveValue: (value: JsxRenderable) => JsxRenderable,
): JsxRenderable {
	const assignedContent = projectedContent.get(normalizeSlotName(value.name));

	if (assignedContent && assignedContent.length > 0) {
		return assignedContent.length === 1 ? assignedContent[0] : (assignedContent as JsxRenderable);
	}

	if (value.fallback === undefined) {
		return '';
	}

	return resolveValue(value.fallback);
}

const voidElementNames = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
]);
