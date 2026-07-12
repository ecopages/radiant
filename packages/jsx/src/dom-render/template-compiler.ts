import { ATTRIBUTE_BINDING_PREFIX } from '../hydration-bindings.ts';
import { getTemplateCacheKey, getTemplateInterpolationParts } from '../template-shape.ts';
import { createBoundaryMarker } from './dom-operations.ts';
import { getElementNamespace, HTML_NAMESPACE_URI, setElementAttributeValue } from './namespaces.ts';
import { getNodeAtPath, getNodePath } from './path-utils.ts';
import { CHILD_BINDING_END_PREFIX, CHILD_BINDING_START_PREFIX } from './constants.ts';
import type { TemplateResultLike } from '../jsx-runtime.ts';
import type {
	BindingDescriptor,
	ChildTemplatePart,
	CompiledTemplate,
	LiveTemplatePart,
	TemplatePart,
} from './types.ts';

const TEMPLATE_CACHE = new WeakMap<readonly string[], CompiledTemplate>();
const TEMPLATE_CACHE_BY_KEY = new Map<string, CompiledTemplate>();

/** Returns compiled metadata for a template shape, compiling and caching on first use. */
export function getCompiledTemplate(template: TemplateResultLike): CompiledTemplate {
	const templateStrings = template.strings as unknown as readonly string[];
	const cachedTemplate = TEMPLATE_CACHE.get(templateStrings);

	if (cachedTemplate) {
		return cachedTemplate;
	}

	const cacheKey = getTemplateCacheKey(template.strings);
	const cachedTemplateByKey = TEMPLATE_CACHE_BY_KEY.get(cacheKey);

	if (cachedTemplateByKey) {
		TEMPLATE_CACHE.set(templateStrings, cachedTemplateByKey);
		return cachedTemplateByKey;
	}

	const htmlParts: string[] = [];
	const bindings = new Map<number, BindingDescriptor>();
	const interpolationParts = getTemplateInterpolationParts(template.strings);

	for (let index = 0; index < template.values.length; index += 1) {
		const interpolationPart = interpolationParts[index];

		if (interpolationPart?.type === 'attribute') {
			htmlParts.push(
				interpolationPart.leading,
				interpolationPart.whitespace,
				`${ATTRIBUTE_BINDING_PREFIX}${index}="${interpolationPart.kind}:${interpolationPart.name}"`,
			);
			bindings.set(index, { kind: interpolationPart.kind, name: interpolationPart.name });
			continue;
		}

		htmlParts.push(
			interpolationPart && interpolationPart.type === 'child'
				? interpolationPart.string
				: (template.strings[index] ?? ''),
			`<!--${CHILD_BINDING_START_PREFIX}${index}-->`,
			`<!--${CHILD_BINDING_END_PREFIX}${index}-->`,
		);
		bindings.set(index, { kind: 'child' });
	}

	htmlParts.push(template.strings[template.strings.length - 1] ?? '');

	const blueprint = document.createElement('template');
	blueprint.innerHTML = htmlParts.join('');

	const compiledTemplate = {
		blueprint,
		parts: collectTemplateParts(blueprint.content, bindings),
	};

	TEMPLATE_CACHE.set(templateStrings, compiledTemplate);
	TEMPLATE_CACHE_BY_KEY.set(cacheKey, compiledTemplate);
	return compiledTemplate;
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

/** Resolves blueprint part metadata into live DOM references for a freshly cloned fragment. */
export function createLiveTemplateParts(
	fragment: DocumentFragment,
	parts: readonly TemplatePart[],
	rootTarget: HTMLElement,
): LiveTemplatePart[] {
	const liveParts: LiveTemplatePart[] = [];

	for (const part of parts) {
		if (part.type === 'attribute') {
			const targetNode = getNodeAtPath(fragment, part.path);

			if (!(targetNode instanceof Element)) {
				continue;
			}

			targetNode.removeAttribute(part.markerName);
			liveParts.push({
				binding: part.binding,
				element: targetNode,
				index: part.index,
				rootTarget,
				subscriptionSerial: 0,
				type: 'attribute',
			});
			continue;
		}

		const startNode = getNodeAtPath(fragment, part.startPath);
		const endNode = getNodeAtPath(fragment, part.endPath);

		if (!(startNode instanceof Comment) || !(endNode instanceof Comment)) {
			continue;
		}

		const startMarker = createBoundaryMarker();
		const endMarker = createBoundaryMarker();
		startNode.replaceWith(startMarker);
		endNode.replaceWith(endMarker);

		liveParts.push({
			endMarker,
			index: part.index,
			mounted: { kind: 'empty' },
			startMarker,
			type: 'child',
		});
	}

	return liveParts;
}

function collectTemplateParts(
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
