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
	/**
	 * True when this value sits inside an `svg` or `math` template, where the browser parses raw-text tags as
	 * ordinary elements.
	 *
	 * @remarks Set by a template whose root is `svg` or `math` and cleared by `foreignObject`, whose children the
	 * browser parses as HTML again. It follows template roots only: `svg` or `math` written in the static
	 * strings of a transported template does not set it.
	 */
	foreignContent?: boolean;
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
	const rootLocalName = template.rootLocalName?.toLowerCase();
	const childOptions: SerializeRenderableOptions = {
		...options,
		nestedInParentHydrationNamespace: true,
		foreignContent: isForeignContentChild(rootLocalName, options.foreignContent === true),
		...(nestedCustomElementRoot ? { mode: 'plain' as const, hydrationBindingState: undefined } : {}),
	};
	if (rootLocalName && RAW_TEXT_ELEMENT_NAMES.has(rootLocalName)) {
		const rawTextHtml = serializeRawTextTemplate(
			template,
			childOptions,
			rootLocalName,
			options.foreignContent === true,
		);

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

function isForeignContentChild(rootLocalName: string | undefined, foreignContent: boolean): boolean {
	return rootLocalName === 'svg' || rootLocalName === 'math' || (foreignContent && rootLocalName !== 'foreignobject');
}

/**
 * Serializes a raw-text element by joining its content, static and dynamic, and escaping the joined text once.
 *
 * @remarks Joining first means a closing tag split across children or across static and dynamic content is still
 * escaped. Returns `undefined` when the template is not shaped like `<tag ...>children</tag>` with child parts
 * last; the caller then serializes it as ordinary content, which entity-escapes dynamic text.
 */
function serializeRawTextTemplate(
	template: TemplateResultLike,
	options: SerializeRenderableOptions,
	elementName: string,
	foreignContent: boolean,
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
	return `${openingAndContentPrefix.slice(0, openingTagEnd + 1)}${escapeRawTextElementText(elementName, rawText, foreignContent)}${closingSuffix.slice(closingTagStart)}`;
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

/**
 * Escapes the joined text of a raw-text element for the context it is parsed in.
 *
 * @remarks In HTML the content is raw text: the parser only looks for `</{tag}` followed by whitespace, `/` or
 * `>`, so that sequence is the only one rewritten, and CSS such as `@media (width < 600px)` or script such as
 * `a < b` stays byte-identical. Inside `svg` or `math` the same tags are ordinary elements, so `<` would open a
 * tag; there the text is entity-escaped, which the parser decodes back to the original characters.
 */
function escapeRawTextElementText(elementName: string, value: string, foreignContent: boolean): string {
	if (foreignContent) {
		return escapeHtml(value);
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
