import { serializeStyleSnapshot } from '../factory/attribute-normalize.ts';
import { endsWithTextContentOpenTag, stringifyTextContentValue } from '../factory/text-content-value.ts';
import { getElementNamespace, HTML_NAMESPACE_URI } from '../dom-render/namespaces.ts';
import { isClientOnlyBinding } from '../hydration/hydration-marker-policy.ts';
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
import { renderIntrinsicCustomElementTemplate } from './server-render.ts';
import type { JsxNodeLike, JsxRenderable, TemplatePartDescriptor, TemplateResultLike } from '../types/index.ts';

const ATTRIBUTE_PART_PREFIX = 'data-radiant-ssr-part-';
const TEXT_PART_PREFIX = 'data-radiant-ssr-text-';
const CHILD_PART_COMMENT_PREFIX = 'radiant-ssr-part:';
const CHILD_PART_IN_TEXT_PATTERN = /<!--radiant-ssr-part:(\d+)-->/;
const TEXT_ONLY_ELEMENT_NAMES = new Set(['script', 'style', 'textarea', 'title']);

type BlueprintElement = {
	readonly type: 'element';
	readonly localName: string;
	readonly namespaceURI: string;
	readonly attributes: ReadonlyArray<readonly [string, string]>;
	readonly attributeParts: readonly number[];
	/** Text of a `script`, `style`, `textarea` or `title`: literal chunks and child part indexes. */
	readonly text?: ReadonlyArray<string | number>;
	readonly children: readonly BlueprintNode[];
};

type BlueprintNode =
	| BlueprintElement
	| { readonly type: 'text'; readonly value: string }
	| { readonly type: 'comment'; readonly data: string }
	| { readonly type: 'part'; readonly index: number };

/**
 * Blueprints keyed by template shape.
 *
 * @remarks Plain data, not DOM, so one cache serves every document implementation.
 */
const BLUEPRINTS_BY_SHAPE = new Map<string, readonly BlueprintNode[]>();

/**
 * Builds JSX as DOM nodes, for the light DOM of a server-rendered custom element.
 *
 * @remarks Dynamic values never pass through an HTML parser: text becomes text nodes and attribute values
 * are set as values, so nothing is escaped and parsed back. Static template markup is parsed once per
 * template shape with `ownerDocument`'s parser, as the client template compiler does. Nested custom
 * elements render through the active custom-element hook. Output carries no hydration markers: client
 * hydration skips custom-element subtrees. Trusted markup (`unsafeHtml`) and DOM nodes are copied by parsing
 * their HTML, which is what they are.
 */
export function renderServerLightDom(value: JsxRenderable | undefined, ownerDocument: Document): Node[] {
	const nodes: Node[] = [];
	appendRenderable(nodes, value, ownerDocument);
	return nodes;
}

function appendRenderable(nodes: Node[], value: unknown, ownerDocument: Document): void {
	if (value === undefined || value === null || typeof value === 'boolean') return;
	if (isKeyedJsxValue(value)) return appendRenderable(nodes, value.value, ownerDocument);
	if (isSubscribableJsxValue(value)) return appendRenderable(nodes, value.getValue(), ownerDocument);
	if (isSignalLikeValue(value)) return appendRenderable(nodes, value.get(), ownerDocument);

	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
		nodes.push(ownerDocument.createTextNode(String(value)));
		return;
	}

	if (isTemplateResultLike(value)) {
		nodes.push(...renderTemplate(value, ownerDocument));
		return;
	}

	if (isJsxNodeLike(value)) {
		nodes.push(...copyNodeLike(value, ownerDocument));
		return;
	}

	if (isIterableRenderable(value)) {
		for (const child of value) appendRenderable(nodes, child, ownerDocument);
		return;
	}

	nodes.push(ownerDocument.createTextNode(String(value)));
}

function renderTemplate(template: TemplateResultLike, ownerDocument: Document): Node[] {
	const customElementHtml = renderIntrinsicCustomElementTemplate(template);

	if (customElementHtml !== undefined) {
		return parseHtml(customElementHtml, ownerDocument);
	}

	return instantiate(getBlueprint(template, ownerDocument), template, ownerDocument);
}

/**
 * @remarks Mirrors `serializeRenderable`: unbranded `outerHTML` is text, never markup.
 */
function copyNodeLike(node: JsxNodeLike, ownerDocument: Document): Node[] {
	if (typeof node.outerHTML === 'string') {
		return mayEmitOrParseRawOuterHtml(node)
			? parseHtml(node.outerHTML, ownerDocument)
			: [ownerDocument.createTextNode(node.outerHTML)];
	}

	if (node.nodeType !== 3 && Array.isArray(node.childNodes)) {
		return node.childNodes.flatMap((child) => copyNodeLike(child, ownerDocument));
	}

	return [ownerDocument.createTextNode(node.textContent ?? '')];
}

function parseHtml(html: string, ownerDocument: Document): Node[] {
	const holder = ownerDocument.createElement('template');
	holder.innerHTML = html;
	const root = (holder as Partial<HTMLTemplateElement>).content ?? holder;
	return Array.from(root.childNodes);
}

function getBlueprint(template: TemplateResultLike, ownerDocument: Document): readonly BlueprintNode[] {
	let blueprint = BLUEPRINTS_BY_SHAPE.get(template.shapeKey);

	if (!blueprint) {
		blueprint = toBlueprint(parseHtml(createBlueprintHtml(template), ownerDocument), HTML_NAMESPACE_URI, undefined);
		BLUEPRINTS_BY_SHAPE.set(template.shapeKey, blueprint);
	}

	return blueprint;
}

/**
 * Static template markup with a marker for each part.
 *
 * @remarks Attribute parts become marker attributes. Child parts become marker comments, except right
 * after a text-only element's start tag, where a comment would be text: those mark the tag instead, as the
 * client template compiler does.
 */
function createBlueprintHtml(template: TemplateResultLike): string {
	let html = '';

	for (let index = 0; index < template.values.length; index += 1) {
		html += template.strings[index] ?? '';
		const part = template.parts[index];

		if (part?.type === 'attribute') {
			html += ` ${ATTRIBUTE_PART_PREFIX}${index}=""`;
		} else if (endsWithTextContentOpenTag(html)) {
			const tagEnd = html.lastIndexOf('>');
			html = `${html.slice(0, tagEnd)} ${TEXT_PART_PREFIX}${index}=""${html.slice(tagEnd)}`;
		} else {
			html += `<!--${CHILD_PART_COMMENT_PREFIX}${index}-->`;
		}
	}

	return `${html}${template.strings[template.strings.length - 1] ?? ''}`;
}

function toBlueprint(
	nodes: readonly Node[],
	parentNamespace: string,
	parentLocalName: string | undefined,
): BlueprintNode[] {
	return nodes.flatMap((node): BlueprintNode[] => {
		if (node.nodeType === 3) return [{ type: 'text', value: node.textContent ?? '' }];

		if (node.nodeType === 8) {
			const data = node.textContent ?? '';
			return data.startsWith(CHILD_PART_COMMENT_PREFIX)
				? [{ type: 'part', index: Number(data.slice(CHILD_PART_COMMENT_PREFIX.length)) }]
				: [{ type: 'comment', data }];
		}

		if (node.nodeType !== 1) return [];

		return [toBlueprintElement(node as Element, parentNamespace, parentLocalName)];
	});
}

function toBlueprintElement(
	element: Element,
	parentNamespace: string,
	parentLocalName: string | undefined,
): BlueprintElement {
	const localName = element.localName;
	const namespaceURI = getElementNamespace(parentNamespace, parentLocalName, localName);
	const attributes: Array<readonly [string, string]> = [];
	const attributeParts: number[] = [];
	const textParts: number[] = [];

	for (const name of element.getAttributeNames()) {
		if (name.startsWith(ATTRIBUTE_PART_PREFIX)) {
			attributeParts.push(Number(name.slice(ATTRIBUTE_PART_PREFIX.length)));
		} else if (name.startsWith(TEXT_PART_PREFIX)) {
			textParts.push(Number(name.slice(TEXT_PART_PREFIX.length)));
		} else {
			attributes.push([name, element.getAttribute(name) ?? '']);
		}
	}

	if (TEXT_ONLY_ELEMENT_NAMES.has(localName)) {
		const content = (element.textContent ?? '')
			.split(CHILD_PART_IN_TEXT_PATTERN)
			.map((chunk, index) => (index % 2 === 1 ? Number(chunk) : chunk))
			.filter((chunk) => chunk !== '');
		return {
			type: 'element',
			localName,
			namespaceURI,
			attributes,
			attributeParts,
			text: [...textParts, ...content],
			children: [],
		};
	}

	const children = toBlueprint(Array.from(element.childNodes), namespaceURI, localName);
	return { type: 'element', localName, namespaceURI, attributes, attributeParts, children };
}

function instantiate(
	blueprint: readonly BlueprintNode[],
	template: TemplateResultLike,
	ownerDocument: Document,
): Node[] {
	return blueprint.flatMap((node): Node[] => {
		switch (node.type) {
			case 'text':
				return [ownerDocument.createTextNode(node.value)];
			case 'comment':
				return [ownerDocument.createComment(node.data)];
			case 'part':
				return renderServerLightDom(template.values[node.index] as JsxRenderable, ownerDocument);
			case 'element':
				return [instantiateElement(node, template, ownerDocument)];
		}
	});
}

function instantiateElement(node: BlueprintElement, template: TemplateResultLike, ownerDocument: Document): Element {
	const element =
		node.namespaceURI !== HTML_NAMESPACE_URI && typeof ownerDocument.createElementNS === 'function'
			? ownerDocument.createElementNS(node.namespaceURI, node.localName)
			: ownerDocument.createElement(node.localName);

	for (const [name, value] of node.attributes) element.setAttribute(name, value);
	for (const index of node.attributeParts) applyAttributePart(element, template.parts[index], template.values[index]);

	if (node.text) {
		element.textContent = node.text
			.map((chunk) => (typeof chunk === 'number' ? stringifyTextContentValue(template.values[chunk]) : chunk))
			.join('');
		return element;
	}

	for (const child of instantiate(node.children, template, ownerDocument)) element.appendChild(child);
	return element;
}

/**
 * @remarks Matches `serializeTemplatePart` in plain mode: client-only kinds (`prop`, events) emit nothing,
 * `bool` sets presence, and `style` objects serialize to a declaration string.
 */
function applyAttributePart(element: Element, part: TemplatePartDescriptor | undefined, rawValue: unknown): void {
	if (part?.type !== 'attribute' || isClientOnlyBinding(part.kind)) return;

	const value = resolveReactiveSnapshot(rawValue);

	if (part.kind === 'bool') {
		if (value) element.setAttribute(part.name, '');
		return;
	}

	if (value === undefined || value === null || value === false) return;

	element.setAttribute(
		part.name,
		part.name.toLowerCase() === 'style' ? serializeStyleSnapshot(value) : String(value),
	);
}
