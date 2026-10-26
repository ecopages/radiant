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
import { isCustomElementSubtreeRoot } from '../hydration/hydration-subtree-policy.ts';
import { isClientOnlyBinding } from '../hydration/hydration-marker-policy.ts';
import { serializeStyleSnapshot } from '../factory/attribute-normalize.ts';
import { RAW_TEXT_ELEMENT_NAMES } from '../factory/raw-text-element-names.ts';
import { stringifyTextContentValue } from '../factory/text-content-value.ts';
import { escapeAttribute, escapeHtml } from './html-escape.ts';
import type { JsxNodeLike, JsxRenderable, TemplateResultLike } from '../types/index.ts';

export type SerializeRenderableMode = 'plain' | 'hydrate';

export type SerializeRenderableOptions = {
	/** `plain` omits hydration markers; `hydrate` emits binding markers where required. */
	mode: SerializeRenderableMode;
	/** When provided, attribute bindings advance `nextBindingIndex` even in `plain` mode. */
	hydrationBindingState?: { nextBindingIndex: number };
	/**
	 * True when this value is nested under a template or iterable that already
	 * owns the hydrate marker namespace.
	 */
	nestedInParentHydrationNamespace?: boolean;
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
		const childOptions: SerializeRenderableOptions = {
			...options,
			nestedInParentHydrationNamespace: true,
		};
		let html = '';

		for (const child of value) {
			html += serializeRenderable(child as JsxRenderable, childOptions);
		}

		return html;
	}

	return escapeHtml(String(value));
}

/**
 * @remarks A nested hyphenated tag does not take indexes from the parent
 * namespace. Registered hosts already return through the custom-element
 * renderer; unregistered tags serialize as plain markup so later siblings keep
 * the indexes the client planner assigns.
 */
function serializeTemplateResult(template: TemplateResultLike, options: SerializeRenderableOptions): string {
	if (options.renderCustomElementTemplate) {
		const customElementHtml = options.renderCustomElementTemplate(template);

		if (customElementHtml !== undefined) {
			return customElementHtml;
		}
	}

	const nestedCustomElementRoot =
		options.nestedInParentHydrationNamespace === true && isCustomElementSubtreeRoot(template.rootLocalName ?? '');
	const childOptions: SerializeRenderableOptions = {
		...options,
		nestedInParentHydrationNamespace: true,
		...(nestedCustomElementRoot ? { mode: 'plain' as const, hydrationBindingState: undefined } : {}),
	};
	const rawTextElementName = template.rootLocalName?.toLowerCase();
	if (rawTextElementName && RAW_TEXT_ELEMENT_NAMES.has(rawTextElementName)) {
		const rawTextHtml = serializeRawTextTemplate(template, childOptions, rawTextElementName);

		if (rawTextHtml !== undefined) {
			return rawTextHtml;
		}
	}

	let html = '';

	for (let index = 0; index < template.values.length; index += 1) {
		const childValue = resolveReactiveSnapshot(template.values[index]);

		html += template.strings[index] ?? '';
		html += serializeTemplatePart(template.parts[index], childValue, childOptions);
	}

	html += template.strings[template.strings.length - 1] ?? '';
	return html;
}

function serializeRawTextTemplate(
	template: TemplateResultLike,
	options: SerializeRenderableOptions,
	elementName: string,
): string | undefined {
	const childIndexes = template.parts.flatMap((part, index) => (part?.type === 'child' ? [index] : []));
	const firstChildIndex = childIndexes[0];
	const lastChildIndex = childIndexes[childIndexes.length - 1];
	if (
		firstChildIndex === undefined ||
		lastChildIndex === undefined ||
		template.parts.slice(firstChildIndex, lastChildIndex + 1).some((part) => part?.type !== 'child') ||
		lastChildIndex !== template.parts.length - 1
	) {
		return undefined;
	}

	let openingAndContentPrefix = '';
	for (let index = 0; index < firstChildIndex; index += 1) {
		openingAndContentPrefix += template.strings[index] ?? '';
		openingAndContentPrefix += serializeTemplatePart(
			template.parts[index],
			resolveReactiveSnapshot(template.values[index]),
			options,
		);
	}
	openingAndContentPrefix += template.strings[firstChildIndex] ?? '';
	const openingTagEnd = findRawTextOpeningTagEnd(openingAndContentPrefix, elementName);
	if (openingTagEnd === undefined) {
		return undefined;
	}

	let rawText = openingAndContentPrefix.slice(openingTagEnd + 1);
	for (let index = firstChildIndex; index <= lastChildIndex; index += 1) {
		rawText += stringifyTextContentValue(template.values[index]);
		if (index < lastChildIndex) {
			rawText += template.strings[index + 1] ?? '';
		}
	}

	const closingSuffix = template.strings[template.strings.length - 1] ?? '';
	const closingTagStart = findRawTextClosingTagStart(closingSuffix, elementName);
	if (closingTagStart === undefined) {
		return undefined;
	}

	rawText += closingSuffix.slice(0, closingTagStart);
	return `${openingAndContentPrefix.slice(0, openingTagEnd + 1)}${escapeRawTextElementText(elementName, rawText)}${closingSuffix.slice(closingTagStart)}`;
}

function findRawTextOpeningTagEnd(html: string, elementName: string): number | undefined {
	const openingTag = new RegExp(`<${elementName}(?=[\\s/>])`, 'i').exec(html);
	if (openingTag?.index === undefined) {
		return undefined;
	}

	let quote: '"' | "'" | undefined;
	for (let index = openingTag.index + openingTag[0].length; index < html.length; index += 1) {
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
			return index;
		}
	}

	return undefined;
}

function findRawTextClosingTagStart(html: string, elementName: string): number | undefined {
	const closingTag = new RegExp(`</${elementName}\\s*>`, 'gi');
	let closingTagStart: number | undefined;
	for (const match of html.matchAll(closingTag)) {
		closingTagStart = match.index;
	}
	return closingTagStart;
}

function escapeRawTextElementText(elementName: string, value: string): string {
	if (elementName === 'style') {
		return value.replaceAll('<', '\\3c ');
	}

	return value.replace(new RegExp(`</(?=${elementName}[\\s/>])`, 'gi'), '<\\/');
}

function serializeTemplatePart(
	part: TemplateResultLike['parts'][number] | undefined,
	value: unknown,
	options: SerializeRenderableOptions,
): string {
	if (!part || part.type === 'child') {
		return serializeRenderable(value as JsxRenderable, options);
	}

	const hydrationState = options.hydrationBindingState;
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
