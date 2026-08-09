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

export function collectAuthoredHydrationScriptMarkup(host: HTMLElement): string | undefined {
	const fragments = Array.from(host.childNodes)
		.filter((node): node is HTMLScriptElement => isHydrationScriptNode(node))
		.map((node) => renderableToHtmlFragment(node) ?? '')
		.filter((fragment) => fragment !== '');

	return fragments.length > 0 ? fragments.join('') : undefined;
}

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
			// Spread rather than enumerate: only `values` is rewritten here, and the
			// template result carries compile metadata that must survive untouched.
			return {
				...currentValue,
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

function getNodeSlotName(node: Node): string {
	if (node instanceof Element) {
		return normalizeSlotName(node.getAttribute('slot'));
	}

	return DEFAULT_SLOT_NAME;
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
