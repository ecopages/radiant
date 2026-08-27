import {
	isIterableRenderable,
	isJsxNodeLike,
	isKeyedJsxValue,
	isSignalLikeValue,
	isSubscribableJsxValue,
	isTemplateResultLike,
	mayEmitOrParseRawOuterHtml,
	resolveReactiveSnapshot,
} from '../types/renderable-guards.ts';
import {
	resolveHydrationMarkerAttributeName,
	serializeBindingDescriptor,
	takeNextHydrationMarkerIndex,
} from '../hydration/hydration-bindings.ts';
import { isClientOnlyBinding } from '../hydration/hydration-marker-policy.ts';
import { serializeStyleSnapshot } from '../factory/attribute-normalize.ts';
import { escapeAttribute, escapeHtml } from './html-escape.ts';
import type { JsxNodeLike, JsxRenderable, TemplateResultLike } from '../types/index.ts';

export type SerializeRenderableMode = 'plain' | 'hydrate';

export type SerializeRenderableOptions = {
	/** `plain` omits hydration markers; `hydrate` emits binding markers where required. */
	mode: SerializeRenderableMode;
	/** When provided, attribute bindings advance `nextBindingIndex` even in `plain` mode. */
	hydrationBindingState?: { nextBindingIndex: number };
	/** Optional custom-element renderer invoked before generic template serialization. */
	renderCustomElementTemplate?: (template: TemplateResultLike) => string | undefined;
};

/**
 * Serializes a JSX renderable value to an HTML string.
 *
 * @param value JSX value to serialize.
 * @param options Controls hydration markers and custom-element template handling.
 */
export function serializeRenderable(value: JsxRenderable | undefined, options: SerializeRenderableOptions): string {
	if (value === undefined || value === null || value === false) {
		return '';
	}

	if (isKeyedJsxValue(value)) {
		return serializeRenderable(value.value, options);
	}

	if (isSubscribableJsxValue(value)) {
		return serializeRenderable(value.getValue(), options);
	}

	if (isSignalLikeValue(value)) {
		return serializeRenderable(value.get(), options);
	}

	if (typeof value === 'string') {
		return escapeHtml(value);
	}

	if (typeof value === 'number' || typeof value === 'bigint') {
		return String(value);
	}

	if (value === true) {
		return '';
	}

	if (isTemplateResultLike(value)) {
		return serializeTemplateResult(value, options);
	}

	if (isJsxNodeLike(value)) {
		return serializeNodeLike(value);
	}

	if (isIterableRenderable(value)) {
		let html = '';

		for (const child of value) {
			html += serializeRenderable(child as JsxRenderable, options);
		}

		return html;
	}

	return escapeHtml(String(value));
}

function serializeTemplateResult(template: TemplateResultLike, options: SerializeRenderableOptions): string {
	if (options.renderCustomElementTemplate) {
		const customElementHtml = options.renderCustomElementTemplate(template);

		if (customElementHtml !== undefined) {
			return customElementHtml;
		}
	}

	const hydrationState = options.hydrationBindingState;
	let html = '';

	for (let index = 0; index < template.values.length; index += 1) {
		const childValue = resolveReactiveSnapshot(template.values[index]);

		html += template.strings[index] ?? '';
		html += serializeTemplatePart(template.parts[index], childValue, options, hydrationState);
	}

	html += template.strings[template.strings.length - 1] ?? '';
	return html;
}

function serializeTemplatePart(
	part: TemplateResultLike['parts'][number] | undefined,
	value: unknown,
	options: SerializeRenderableOptions,
	hydrationState: SerializeRenderableOptions['hydrationBindingState'],
): string {
	if (!part || part.type === 'child') {
		return serializeRenderable(value as JsxRenderable, options);
	}

	const bindingIndex = hydrationState ? takeNextHydrationMarkerIndex(hydrationState) : 0;
	const hydrationMarker =
		options.mode === 'hydrate' && hydrationState
			? ` ${resolveHydrationMarkerAttributeName(bindingIndex)}="${serializeBindingDescriptor(part.kind, part.name)}"`
			: '';

	if (isClientOnlyBinding(part.kind)) return hydrationMarker;
	if (part.kind === 'bool') return value ? `${hydrationMarker} ${part.name}` : hydrationMarker;
	if (value === undefined || value === null || value === false) return hydrationMarker;

	const attributeValue = part.name.toLowerCase() === 'style' ? serializeStyleSnapshot(value) : String(value);
	return `${hydrationMarker} ${part.name}="${escapeAttribute(attributeValue)}"`;
}

function serializeNodeLike(node: JsxNodeLike): string {
	const outerHTML = node.outerHTML;

	if (typeof outerHTML === 'string') {
		return mayEmitOrParseRawOuterHtml(node) ? outerHTML : escapeHtml(outerHTML);
	}

	if (node.nodeType === 3) {
		return escapeHtml(node.textContent ?? '');
	}

	if (Array.isArray(node.childNodes)) {
		return node.childNodes.map((child) => serializeNodeLike(child)).join('');
	}

	return escapeHtml(node.textContent ?? '');
}
