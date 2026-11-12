import { ATTRIBUTE_BINDING_PREFIX } from '../hydration/hydration-bindings.ts';
import { createBoundaryMarker } from './dom-operations.ts';
import { getElementNamespace, HTML_NAMESPACE_URI, setElementAttributeValue } from './namespaces.ts';
import { getNodeAtPath, getNodePath } from './path-utils.ts';
import { CHILD_BINDING_END_PREFIX, CHILD_BINDING_START_PREFIX, TEXT_CONTENT_LOCATOR_PREFIX } from './constants.ts';
import { endsWithTextContentOpenTag } from './text-content.ts';
import type { TemplateResultLike } from '../types/index.ts';
import type {
	BindingDescriptor,
	ChildTemplatePart,
	ClientTemplatePart,
	CompiledTemplate,
	LiveTemplatePart,
	TemplatePart,
	TextContentTemplatePart,
} from './types.ts';

/**
 * Compiled blueprints keyed by template shape.
 *
 * Every `jsx(...)` call allocates a fresh `strings` array, so identity-based caching
 * would never hit across calls — the shape key is what makes reuse possible. The key
 * is computed once by the factory and carried on the result.
 */
const TEMPLATE_CACHE_BY_SHAPE = new Map<string, CompiledTemplate>();

/** Returns compiled metadata for a template shape, compiling and caching on first use. */
export function getCompiledTemplate(template: TemplateResultLike): CompiledTemplate {
	const cachedTemplate = TEMPLATE_CACHE_BY_SHAPE.get(template.shapeKey);

	if (cachedTemplate) {
		return cachedTemplate;
	}

	const htmlParts: string[] = [];
	const bindings = new Map<number, BindingDescriptor>();
	const textContentBindingIndices: number[] = [];

	for (let index = 0; index < template.values.length; index += 1) {
		const part = template.parts[index];

		htmlParts.push(template.strings[index] ?? '');

		if (part?.type === 'attribute') {
			htmlParts.push(` ${ATTRIBUTE_BINDING_PREFIX}${index}="${part.kind}:${part.name}"`);
			bindings.set(index, { kind: part.kind, name: part.name });
			continue;
		}

		if (endsWithTextContentOpenTag(htmlParts.join(''))) {
			insertTextContentLocator(htmlParts, index);
			bindings.set(index, { kind: 'child' });
			textContentBindingIndices.push(index);
			continue;
		}

		htmlParts.push(`<!--${CHILD_BINDING_START_PREFIX}${index}-->`, `<!--${CHILD_BINDING_END_PREFIX}${index}-->`);
		bindings.set(index, { kind: 'child' });
	}

	htmlParts.push(template.strings[template.strings.length - 1] ?? '');

	const blueprint = document.createElement('template');
	blueprint.innerHTML = htmlParts.join('');

	const parts = collectTemplateParts(blueprint.content, bindings, textContentBindingIndices);
	const client = createClientContent(blueprint.content, parts);
	const compiledTemplate = {
		blueprint,
		clientContent: client.content,
		clientParts: client.parts,
		parts,
		structureKey: getFactoryStructureKey(template.shapeKey),
	};

	TEMPLATE_CACHE_BY_SHAPE.set(template.shapeKey, compiledTemplate);
	return compiledTemplate;
}

/**
 * The part of a factory shape key that does not name attributes: the tag and how many child slots follow.
 *
 * @remarks Factory keys start with `\u0001`, the tag, then one `\u0002`-separated token per part, where `c` is a child
 * slot. Keys of transported templates carry no such structure, so they have none.
 */
function getFactoryStructureKey(shapeKey: string): string | undefined {
	if (!shapeKey.startsWith('\u0001')) return undefined;

	const tokens = shapeKey.split('\u0002');
	return `${tokens[0]}\u0002${tokens.filter((token, index) => index > 0 && token === 'c').length}`;
}

/** Repairs the namespace of a cloned template root before live part resolution. */
export function normalizeTemplateFragmentNamespaces(
	fragment: DocumentFragment,
	contextParent: Node | null,
	rootLocalName: string | undefined,
): void {
	const contextElement = contextParent instanceof Element ? contextParent : contextParent?.parentElement;
	const contextNamespace = contextElement?.namespaceURI ?? HTML_NAMESPACE_URI;
	const contextLocalName = contextElement?.localName;
	const rootElement = fragment.firstElementChild;

	if (!rootElement) {
		return;
	}

	const authoredRootLocalName = rootLocalName ?? rootElement.localName;
	const expectedAuthoredNamespace = getElementNamespace(contextNamespace, contextLocalName, authoredRootLocalName);

	if (rootElement.namespaceURI === expectedAuthoredNamespace && rootElement.localName === authoredRootLocalName) {
		return;
	}

	fragment.replaceChild(
		recreateElementInNamespace(rootElement, expectedAuthoredNamespace, authoredRootLocalName),
		rootElement,
	);
}

type ClientChildBounds = {
	end: ChildNode | null;
	owner: ParentNode | null;
	part: ChildTemplatePart;
	start: ChildNode | null;
};

/**
 * Copies `content` for client mounts: attribute markers removed and child comment markers replaced by as few text
 * markers as the slots need (see {@link CompiledTemplate.clientContent}).
 */
function createClientContent(
	content: DocumentFragment,
	parts: readonly TemplatePart[],
): { content: DocumentFragment; parts: ClientTemplatePart[] } {
	const clientContent = content.cloneNode(true) as DocumentFragment;
	const childParts = parts.filter((part): part is ChildTemplatePart => part.type === 'child');
	const comments = new Map<Node, ChildTemplatePart>();
	const groups = new Map<ParentNode, ChildTemplatePart[]>();

	for (const part of parts) {
		if (part.type !== 'attribute') continue;
		const element = getNodeAtPath(clientContent, part.path);
		if (element instanceof Element) element.removeAttribute(part.markerName);
	}

	for (const part of childParts) {
		const startNode = getNodeAtPath(clientContent, part.startPath);
		const endNode = getNodeAtPath(clientContent, part.endPath);
		if (!startNode || !endNode || !startNode.parentNode) continue;
		comments.set(startNode, part);
		comments.set(endNode, part);
		const group = groups.get(startNode.parentNode) ?? [];
		group.push(part);
		groups.set(startNode.parentNode, group);
	}

	const bounds = new Map<ChildTemplatePart, ClientChildBounds>();

	for (const [parent, group] of groups) {
		const ordered = readSlotOnlyChildren(parent, comments);

		if (ordered) {
			const markers = ordered.slice(1).map(() => createBoundaryMarker());
			parent.replaceChildren(...markers);
			ordered.forEach((part, index) => {
				bounds.set(part, {
					end: markers[index] ?? null,
					owner: ordered.length === 1 ? parent : null,
					part,
					start: index > 0 ? markers[index - 1]! : null,
				});
			});
			continue;
		}

		for (const part of group) {
			const start = createBoundaryMarker();
			const end = createBoundaryMarker();
			(getNodeAtPath(clientContent, part.startPath) as ChildNode).replaceWith(start);
			(getNodeAtPath(clientContent, part.endPath) as ChildNode).replaceWith(end);
			bounds.set(part, { end, owner: null, part, start });
		}
	}

	const clientParts = parts.map((part): ClientTemplatePart => {
		if (part.type !== 'child') return part;
		const bound = bounds.get(part);
		return {
			endPath: bound?.end ? getNodePath(clientContent, bound.end) : null,
			index: part.index,
			ownerPath: bound?.owner ? getNodePath(clientContent, bound.owner as Node) : null,
			startPath: bound?.start ? getNodePath(clientContent, bound.start) : null,
			type: 'child',
		};
	});

	return { content: clientContent, parts: clientParts };
}

/**
 * Returns the slots of `parent` in order when its children are only their start and end comments, in pairs.
 *
 * @remarks Only a native element qualifies. Slots at the top of a fragment change parent when the fragment is
 * inserted, and a custom element may manage its own children (and Radiant reads the markers inside a host), so
 * both keep full markers.
 */
function readSlotOnlyChildren(
	parent: ParentNode,
	comments: ReadonlyMap<Node, ChildTemplatePart>,
): ChildTemplatePart[] | undefined {
	if (!(parent instanceof Element) || parent.localName.includes('-') || parent.hasAttribute('is')) return undefined;

	const ordered: ChildTemplatePart[] = [];
	const nodes = parent.childNodes;

	if (nodes.length === 0 || nodes.length % 2 !== 0) return undefined;

	for (let index = 0; index < nodes.length; index += 2) {
		const part = comments.get(nodes[index]!);
		if (!part || comments.get(nodes[index + 1]!) !== part) return undefined;
		ordered.push(part);
	}

	return ordered;
}

/** Resolves {@link CompiledTemplate.clientParts} into live DOM references for a fresh clone of `clientContent`. */
export function createLiveTemplateParts(
	fragment: DocumentFragment,
	parts: readonly ClientTemplatePart[],
	rootTarget: HTMLElement,
): LiveTemplatePart[] {
	const liveParts: LiveTemplatePart[] = [];

	for (const part of parts) {
		if (part.type === 'child') {
			const start = part.startPath ? getNodeAtPath(fragment, part.startPath) : null;
			const end = part.endPath ? getNodeAtPath(fragment, part.endPath) : null;
			const owner = part.ownerPath ? getNodeAtPath(fragment, part.ownerPath) : null;

			if (start === undefined || end === undefined || (!start && !end && !(owner instanceof Element))) continue;

			liveParts.push({
				end: end as ChildNode | null,
				index: part.index,
				mounted: { kind: 'empty' },
				owner: owner instanceof Element ? owner : undefined,
				start: start as ChildNode | null,
				type: 'child',
			});
			continue;
		}

		const element = getNodeAtPath(fragment, part.path);
		if (!(element instanceof Element)) continue;

		liveParts.push(
			part.type === 'attribute'
				? {
						binding: part.binding,
						element,
						index: part.index,
						rootTarget,
						subscriptionSerial: 0,
						type: 'attribute',
					}
				: { committedText: '', element, index: part.index, subscriptionSerial: 0, type: 'text-content' },
		);
	}

	return liveParts;
}

function collectTemplateParts(
	fragment: DocumentFragment,
	bindings: ReadonlyMap<number, BindingDescriptor>,
	textContentBindingIndices: readonly number[],
): TemplatePart[] {
	return [
		...collectAttributeParts(fragment, bindings),
		...collectChildParts(fragment, bindings),
		...collectTextContentParts(fragment, textContentBindingIndices),
	];
}

function collectAttributeParts(
	fragment: DocumentFragment,
	bindings: ReadonlyMap<number, BindingDescriptor>,
): TemplatePart[] {
	const parts: TemplatePart[] = [];
	const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT);
	let currentNode = walker.nextNode();

	while (currentNode) {
		const element = currentNode as Element;
		const attributes = Array.from(element.attributes);

		for (const attribute of attributes) {
			if (!attribute.name.startsWith(ATTRIBUTE_BINDING_PREFIX)) {
				continue;
			}

			const index = Number(attribute.name.slice(ATTRIBUTE_BINDING_PREFIX.length));
			const binding = bindings.get(index);

			if (!binding || binding.kind === 'child') {
				continue;
			}

			parts.push({
				binding,
				index,
				markerName: attribute.name,
				path: getNodePath(fragment, element),
				type: 'attribute',
			});
		}

		currentNode = walker.nextNode();
	}

	return parts;
}

function collectChildParts(
	fragment: DocumentFragment,
	bindings: ReadonlyMap<number, BindingDescriptor>,
): TemplatePart[] {
	const childMarkers = new Map<number, Partial<ChildTemplatePart>>();
	const commentWalker = document.createTreeWalker(fragment, NodeFilter.SHOW_COMMENT);
	let commentNode = commentWalker.nextNode();

	while (commentNode) {
		const comment = commentNode as Comment;

		if (comment.data.startsWith(CHILD_BINDING_START_PREFIX)) {
			const index = Number(comment.data.slice(CHILD_BINDING_START_PREFIX.length));
			const marker = childMarkers.get(index) ?? { index, type: 'child' };
			marker.startPath = getNodePath(fragment, comment);
			childMarkers.set(index, marker);
		}

		if (comment.data.startsWith(CHILD_BINDING_END_PREFIX)) {
			const index = Number(comment.data.slice(CHILD_BINDING_END_PREFIX.length));
			const marker = childMarkers.get(index) ?? { index, type: 'child' };
			marker.endPath = getNodePath(fragment, comment);
			childMarkers.set(index, marker);
		}

		commentNode = commentWalker.nextNode();
	}

	const parts: TemplatePart[] = [];
	for (const [index, marker] of childMarkers) {
		const binding = bindings.get(index);

		if (binding?.kind !== 'child' || !marker.startPath || !marker.endPath) {
			continue;
		}

		parts.push({
			endPath: marker.endPath,
			index,
			startPath: marker.startPath,
			type: 'child',
		});
	}

	return parts;
}

function collectTextContentParts(
	fragment: DocumentFragment,
	textContentBindingIndices: readonly number[],
): TextContentTemplatePart[] {
	if (textContentBindingIndices.length === 0) {
		return [];
	}

	const locatorIndices = new Map(
		textContentBindingIndices.map((index) => [`${TEXT_CONTENT_LOCATOR_PREFIX}${index}`, index]),
	);
	const parts: TextContentTemplatePart[] = [];
	const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT);
	let currentNode = walker.nextNode();

	while (currentNode) {
		const element = currentNode as Element;

		for (const attribute of Array.from(element.attributes)) {
			const index = locatorIndices.get(attribute.name);

			if (index === undefined) {
				continue;
			}

			parts.push({
				index,
				path: getNodePath(fragment, element),
				type: 'text-content',
			});
			element.removeAttribute(attribute.name);
		}

		currentNode = walker.nextNode();
	}

	parts.sort((left, right) => left.index - right.index);
	return parts;
}

function insertTextContentLocator(htmlParts: string[], index: number): void {
	const marker = ` ${TEXT_CONTENT_LOCATOR_PREFIX}${index}=""`;

	for (let partIndex = htmlParts.length - 1; partIndex >= 0; partIndex -= 1) {
		const part = htmlParts[partIndex];

		if (part === undefined) {
			continue;
		}

		const closingBracket = part.lastIndexOf('>');

		if (closingBracket === -1) {
			continue;
		}

		htmlParts[partIndex] = `${part.slice(0, closingBracket)}${marker}${part.slice(closingBracket)}`;
		return;
	}
}

function recreateElementInNamespace(element: Element, namespace: string, localName: string): Element {
	const replacement = document.createElementNS(namespace, localName);

	for (const attribute of Array.from(element.attributes)) {
		if (attribute.namespaceURI) {
			replacement.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
			continue;
		}

		setElementAttributeValue(replacement, attribute.name, attribute.value);
	}

	replacement.append(...element.childNodes);

	return replacement;
}
