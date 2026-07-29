import {
	isIterableJsxChild,
	isIterableRenderable,
	isJsxNodeLike,
	isKeyedJsxValue,
	isSerializableTemplateResultLike,
	isSignalLikeValue,
	isSubscribableJsxValue,
	isTemplateResultLike,
	mayEmitOrParseRawOuterHtml,
	resolveReactiveSnapshot,
	toTemplateResultLike,
} from '../types/renderable-guards.ts';
import {
	getTemplateInterpolationParts,
	resolveHydrationMarkerAttributeName,
	serializeBindingDescriptor,
	takeNextHydrationMarkerIndex,
} from '../hydration/hydration-bindings.ts';
import { isClientOnlyBinding, needsHydrationMarker } from '../hydration/hydration-marker-policy.ts';
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

	if (isTemplateResultLike(value) || isSerializableTemplateResultLike(value)) {
		return serializeTemplateResult(toTemplateResultLike(value), options);
	}

	if (isJsxNodeLike(value)) {
		return serializeNodeLike(value);
	}

	const iterable =
		options.mode === 'plain' && isIterableJsxChild(value) ? value : isIterableRenderable(value) ? value : null;

	if (iterable) {
		let html = '';

		for (const child of iterable) {
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

	const interpolationParts = getTemplateInterpolationParts(template.strings);
	const hydrationState = options.hydrationBindingState;
	let html = '';

	for (let index = 0; index < template.values.length; index += 1) {
		const interpolationPart = interpolationParts[index];
		const childValue = resolveReactiveSnapshot(template.values[index]);

		if (!interpolationPart || interpolationPart.type === 'child') {
			html +=
				interpolationPart && interpolationPart.type === 'child'
					? interpolationPart.string
					: (template.strings[index] ?? '');
			html += serializeRenderable(childValue as JsxRenderable, options);
			continue;
		}

		const bindingKind = interpolationPart.kind;
		const bindingIndex = hydrationState ? takeNextHydrationMarkerIndex(hydrationState) : 0;
		html += interpolationPart.leading;

		if (options.mode === 'hydrate' && hydrationState && needsHydrationMarker(bindingKind)) {
			html += `${interpolationPart.whitespace}${resolveHydrationMarkerAttributeName(bindingIndex)}="${serializeBindingDescriptor(bindingKind, interpolationPart.name)}"`;
		}

		if (isClientOnlyBinding(bindingKind)) {
			continue;
		}

		if (interpolationPart.prefix === '?') {
			if (childValue) {
				html += `${interpolationPart.whitespace}${interpolationPart.name}`;
			}
			continue;
		}

		if (childValue === undefined || childValue === null || childValue === false) {
			continue;
		}

		const attributeValue =
			interpolationPart.name.toLowerCase() === 'style'
				? serializeStyleSnapshot(childValue)
				: String(childValue);
		html += `${interpolationPart.whitespace}${interpolationPart.name}="${escapeAttribute(attributeValue)}"`;
	}

	html += template.strings[template.strings.length - 1] ?? '';
	return html;
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
