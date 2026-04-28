import { type JsxRenderable, type TemplateResultLike } from './jsx-runtime.ts';
import {
	ATTRIBUTE_BINDING_PREFIX,
	collectHydrationBindings,
	getTemplateInterpolationParts,
	parseBindingDescriptor,
} from './hydration-bindings.ts';
import { createBoundaryMarker, visitElements } from './dom-render/dom-operations.ts';
import { captureFocusSnapshot, restoreFocusSnapshot } from './dom-render/focus-snapshot.ts';
import { hydrateTemplateInstance } from './dom-render/hydration.ts';
import { getElementNamespace, HTML_NAMESPACE_URI, setElementAttributeValue } from './dom-render/namespaces.ts';
import { getNodeAtPath, getNodePath } from './dom-render/path-utils.ts';
import {
	applyAttributeBinding,
	disposeMountedRoot,
	type ReconciliationRuntime,
	updateLiveAttributePart,
	updateRangeContent,
} from './dom-render/reconciliation.ts';
import {
	createNodesFromValue,
	flushDeferredProperties,
	isTemplateResultLike,
	unwrapKeyedValue,
} from './dom-render/runtime-helpers.ts';
import { CHILD_BINDING_END_PREFIX, CHILD_BINDING_START_PREFIX } from './dom-render/constants.ts';
import type {
	BindingDescriptor,
	ChildTemplatePart,
	CompiledTemplate,
	DeferredPropertyBinding,
	LiveTemplatePart,
	MountedRoot,
	TemplateInstance,
	TemplatePart,
} from './dom-render/types.ts';
/**
 * Per-root render state used to decide whether a subsequent render can update
 * an existing template instance in place or must dispose and remount.
 */
const ROOT_RENDER_STATE = new WeakMap<HTMLElement, MountedRoot>();
/**
 * Template cache keyed by the static string shape.
 *
 * The cache stores the parsed blueprint and part metadata so repeated renders
 * of the same template shape only need to clone and bind live nodes.
 */
const TEMPLATE_CACHE = new WeakMap<readonly string[], CompiledTemplate>();
/**
 * Secondary template cache keyed by a deterministic string derived from the static string shapes.
 *
 * This cache bridges the object-identity gap that occurs when the same logical template is
 * re-evaluated after a hot-module reload, allowing the blueprint to be reused across
 * module boundary resets where `TemplateStringsArray` identity would otherwise be lost.
 */
const TEMPLATE_CACHE_BY_KEY = new Map<string, CompiledTemplate>();
const RENDER_RUNTIME: ReconciliationRuntime = {
	createTemplateInstance,
	getCompiledTemplate,
};

/**
 * Imperative handle returned by {@link createRoot} for managing a mounted JSX tree.
 *
 * Provides `render`, `hydrate`, and `unmount` methods so application entry-points can
 * drive the renderer without importing the lower-level `render`/`hydrate` functions
 * directly.
 */
export interface JsxRoot {
	render: (element: JsxRenderable) => void;
	hydrate: (element: JsxRenderable) => void;
	unmount: () => void;
}

/**
 * Renders a JSX value into a target element.
 *
 * Template results now keep a live instance when the template shape is stable,
 * allowing repeated renders to patch existing parts instead of replacing the
 * whole subtree.
 */
export function render(element: JsxRenderable, target: HTMLElement): void {
	const focusSnapshot = captureFocusSnapshot(target);
	const deferredProperties: DeferredPropertyBinding[] = [];
	const nextValue = unwrapKeyedValue(element);
	const currentRenderState = ROOT_RENDER_STATE.get(target);

	if (isTemplateResultLike(nextValue)) {
		const compiledTemplate = getCompiledTemplate(nextValue);

		if (currentRenderState?.kind === 'template' && currentRenderState.instance.compiled === compiledTemplate) {
			currentRenderState.instance.update(nextValue.values, deferredProperties);
		} else {
			if (currentRenderState) {
				disposeMountedRoot(currentRenderState);
			}

			const instance = createTemplateInstance(nextValue, target, deferredProperties, target);
			target.replaceChildren(...instance.rootNodes);
			ROOT_RENDER_STATE.set(target, { instance, kind: 'template' });
		}
	} else {
		if (currentRenderState) {
			disposeMountedRoot(currentRenderState);
		}

		target.replaceChildren(
			...createNodesFromValue(
				nextValue,
				target,
				deferredProperties,
				RENDER_RUNTIME.createTemplateInstance,
				target,
			),
		);
		ROOT_RENDER_STATE.set(target, { kind: 'value' });
	}

	flushDeferredProperties(deferredProperties);

	restoreFocusSnapshot(target, focusSnapshot);
}

/**
 * Hydrates an SSR-rendered JSX subtree by attaching event and property bindings in place.
 */
export function hydrate(element: JsxRenderable, target: HTMLElement): void {
	const currentRenderState = ROOT_RENDER_STATE.get(target);

	if (currentRenderState) {
		disposeMountedRoot(currentRenderState);
	}

	ROOT_RENDER_STATE.delete(target);

	const nextValue = unwrapKeyedValue(element);

	if (isTemplateResultLike(nextValue)) {
		if (!hasHydrationMarkers(target)) {
			render(element, target);
			return;
		}

		const focusSnapshot = captureFocusSnapshot(target);
		const deferredProperties: DeferredPropertyBinding[] = [];
		const instance = hydrateTemplateInstance(nextValue, target, deferredProperties, RENDER_RUNTIME);

		if (!instance) {
			render(element, target);
			return;
		}

		ROOT_RENDER_STATE.set(target, { instance, kind: 'template' });
		flushDeferredProperties(deferredProperties);
		restoreFocusSnapshot(target, focusSnapshot);
		return;
	}

	const focusSnapshot = captureFocusSnapshot(target);
	const deferredProperties: DeferredPropertyBinding[] = [];
	const bindings = collectHydrationBindings(element);

	if (
		!visitHydrationBindingMarkers(target, (element, attribute) => {
			const bindingIndex = Number(attribute.name.slice(ATTRIBUTE_BINDING_PREFIX.length));
			const parsedBinding = parseBindingDescriptor(attribute.value);
			element.removeAttribute(attribute.name);

			if (!parsedBinding) {
				return;
			}

			const binding = bindings.get(bindingIndex);

			if (!binding) {
				return;
			}

			applyAttributeBinding(element, parsedBinding, binding.value, target, deferredProperties);
		})
	) {
		render(element, target);
		return;
	}

	flushDeferredProperties(deferredProperties);

	restoreFocusSnapshot(target, focusSnapshot);
}

/**
 * Returns `true` when `target` contains at least one element with a hydration-binding
 * attribute marker.
 *
 * Used by {@link hydrate} to decide whether the DOM was produced by an SSR pass that
 * embedded binding descriptors, or whether a full client render is needed instead.
 *
 * @param target Root element to inspect.
 */
export function hasHydrationMarkers(target: HTMLElement): boolean {
	return visitHydrationBindingMarkers(target, () => undefined);
}

/**
 * Walks the subtree rooted at `target` and invokes `visit` for every attribute whose
 * name starts with {@link ATTRIBUTE_BINDING_PREFIX}.
 *
 * Attributes are iterated in reverse index order so that callers may safely call
 * `removeAttribute` inside `visit` without corrupting the live `NamedNodeMap`.
 *
 * @param target Root element to walk.
 * @param visit Callback invoked for each binding marker attribute found.
 * @returns `true` when at least one binding marker was found, `false` otherwise.
 */
function visitHydrationBindingMarkers(
	target: HTMLElement,
	visit: (element: Element, attribute: Attr) => void,
): boolean {
	let foundHydrationMarker = false;

	visitElements(target, (element) => {
		const attributes = element.attributes;

		for (let index = attributes.length - 1; index >= 0; index -= 1) {
			const attribute = attributes[index];

			if (!attribute || !attribute.name.startsWith(ATTRIBUTE_BINDING_PREFIX)) {
				continue;
			}

			foundHydrationMarker = true;
			visit(element, attribute);
		}

		return false;
	});

	return foundHydrationMarker;
}

/**
 * Creates a small root API for imperative mounting from plain application entrypoints.
 */
export function createRoot(target: HTMLElement): JsxRoot {
	return {
		render(element: JsxRenderable) {
			render(element, target);
		},
		hydrate(element: JsxRenderable) {
			hydrate(element, target);
		},
		unmount() {
			const currentRenderState = ROOT_RENDER_STATE.get(target);

			if (currentRenderState) {
				disposeMountedRoot(currentRenderState);
			}

			ROOT_RENDER_STATE.delete(target);
			target.replaceChildren();
		},
	};
}

/**
 * Clones a compiled template blueprint and creates the live part records used
 * for incremental updates after the initial mount.
 */
function createTemplateInstance(
	template: TemplateResultLike,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	contextParent: Node | null = rootTarget,
): TemplateInstance {
	const compiledTemplate = getCompiledTemplate(template);
	const fragment = compiledTemplate.blueprint.content.cloneNode(true) as DocumentFragment;
	normalizeTemplateFragmentNamespaces(fragment, contextParent, template.rootLocalName);
	const parts = createLiveTemplateParts(fragment, compiledTemplate.parts, rootTarget);
	const rootNodes = Array.from(fragment.childNodes);

	const instance: TemplateInstance = {
		compiled: compiledTemplate,
		parts,
		rootTarget,
		rootNodes,
		update(values, nextDeferredProperties) {
			for (const part of parts) {
				if (part.type === 'attribute') {
					updateLiveAttributePart(part, values[part.index], nextDeferredProperties, RENDER_RUNTIME);
					continue;
				}

				part.mounted = updateRangeContent(
					part.startMarker,
					part.endMarker,
					values[part.index],
					part.mounted,
					rootTarget,
					nextDeferredProperties,
					RENDER_RUNTIME,
				);
			}
		},
	};

	instance.update(template.values, deferredProperties);
	return instance;
}

function normalizeTemplateFragmentNamespaces(
	fragment: DocumentFragment,
	contextParent: Node | null,
	rootLocalName: string | undefined,
): void {
	// Intrinsic JSX templates compile to a single element shell with dynamic child slots,
	// so namespace repair only needs to fix that root element. Nested intrinsic children
	// are mounted through their own template instances with their own authored root tags.
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

/**
 * Returns the compiled metadata for a template shape, compiling and caching it
 * on first use.
 */
function getCompiledTemplate(template: TemplateResultLike): CompiledTemplate {
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

/**
 * Derives a stable string cache key from a `TemplateStringsArray`.
 *
 * The key encodes both the length and content of each string segment so two
 * templates that happen to produce equal concatenated HTML but differ in where
 * the interpolation boundaries lie — and therefore have different binding
 * positions — always produce distinct keys.
 *
 * @param strings Static string segments from a template result.
 * @returns A deterministic cache key string.
 */
function getTemplateCacheKey(strings: readonly string[]): string {
	return strings.map((part) => `${part.length}:${part}`).join('|');
}

/**
 * Walks a compiled template blueprint and records where every dynamic
 * attribute and child binding lives relative to the fragment root.
 */
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

/**
 * Resolves blueprint part metadata into live DOM references for a freshly
 * cloned fragment.
 */
function createLiveTemplateParts(
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
