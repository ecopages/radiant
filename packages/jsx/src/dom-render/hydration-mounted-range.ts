import { countHydrationMarkers } from '../hydration/hydration-bindings.ts';
import { shouldSkipHydrationSubtree } from '../hydration/hydration-subtree-policy.ts';
import { hydrateTemplateInstance } from './hydration.ts';
import { takesChildrenValue } from '../factory/jsx-factory.ts';
import { getCompiledTemplate } from './template-compiler.ts';
import { CHILD_BINDING_END_PREFIX, CHILD_BINDING_START_PREFIX } from './constants.ts';
import type { JsxKey, JsxRenderable, TemplateResultLike } from '../types/index.ts';
import { mountReactiveChildSource, updateRangeContent } from './child-range-update.ts';
import { countHydratedRangeNodes, isEmptyTextNode } from './hydration-planning.ts';
import { disposeMountedRangeContent } from './mounted-disposal.ts';
import { createHydratedRangeRecord, mountedContentFromNodes } from './range-records.ts';
import {
	canRenderAsTextNode,
	flushDeferredProperties,
	getIterableChildren,
	getKeyedChildren,
	isIterableRenderable,
	isReactiveChildSource,
	isTemplateResultLike,
	unwrapKeyedValue,
} from './runtime-helpers.ts';
import type {
	DeferredPropertyBinding,
	MountedIndexedList,
	MountedKeyedList,
	MountedRangeContent,
	MountedRangeRecord,
	TemplateInstance,
} from './types.ts';

/**
 * Rebuilds mounted range bookkeeping around hydrated nodes.
 *
 * The goal is to preserve SSR DOM identity where possible while still restoring
 * the richer runtime structures needed for subscriptions, grouped children, and
 * nested template updates.
 */
export function hydrateMountedRangeContent(
	startMarker: Text,
	endMarker: Text,
	value: unknown,
	existingNodes: readonly Node[],
	rootTarget: HTMLElement,
	bindingBaseIndex: number,
): MountedRangeContent {
	const nextValue = unwrapKeyedValue(value);

	if (isReactiveChildSource(nextValue)) {
		return mountReactiveChildSource(
			startMarker,
			endMarker,
			nextValue,
			mountedContentFromNodes(existingNodes),
			rootTarget,
			[],
		);
	}

	return hydrateMountedRangeContentSnapshot(
		startMarker,
		endMarker,
		nextValue,
		existingNodes,
		rootTarget,
		bindingBaseIndex,
	);
}

function hydrateMountedRangeContentSnapshot(
	startMarker: Text,
	endMarker: Text,
	nextValue: unknown,
	existingNodes: readonly Node[],
	rootTarget: HTMLElement,
	bindingBaseIndex: number,
): MountedRangeContent {
	const bootstrapMounted = mountedContentFromNodes(existingNodes);

	if (
		isTemplateResultLike(nextValue) &&
		(!shouldSkipHydrationSubtree(nextValue.rootLocalName ?? '') || canAdoptCustomElement(nextValue, existingNodes))
	) {
		const hydratedTemplateInstance = hydrateTemplateRange(nextValue, existingNodes, rootTarget, bindingBaseIndex);

		if (hydratedTemplateInstance) {
			return { instance: hydratedTemplateInstance, kind: 'template' };
		}
	}

	const iterableChildren = getIterableChildren(nextValue);

	if (iterableChildren) {
		const hydratedListState = hydrateListRangeContent(
			endMarker,
			iterableChildren,
			existingNodes,
			rootTarget,
			bindingBaseIndex,
		);

		if (hydratedListState) {
			return hydratedListState;
		}
	}

	// Anything still unresolved is reconciled against the SSR nodes as-is. Text-like
	// values keep their existing node so hydration patches `data` instead of
	// replacing it; every other shape rebuilds from the bootstrap snapshot.
	if (!needsReconciliationAgainstSsrNodes(nextValue, bootstrapMounted)) {
		return bootstrapMounted;
	}

	return flushWithDeferredProperties((deferredProperties) =>
		updateRangeContent(startMarker, endMarker, nextValue, bootstrapMounted, rootTarget, deferredProperties),
	);
}

/**
 * Returns whether a hydrated range still needs a reconciliation pass, or whether the
 * SSR nodes already represent the value exactly.
 */
function needsReconciliationAgainstSsrNodes(nextValue: unknown, bootstrapMounted: MountedRangeContent): boolean {
	if (isTemplateResultLike(nextValue) || isIterableRenderable(nextValue)) {
		return true;
	}

	if (nextValue === undefined || nextValue === null || nextValue === false || isEmptyTextNode(nextValue)) {
		return true;
	}

	return bootstrapMounted.kind === 'text' && canRenderAsTextNode(nextValue);
}

/**
 * Runs `mount` with a fresh deferred-property queue and flushes it before returning.
 *
 * Hydration mounts each range eagerly rather than joining the caller's render pass,
 * so property writes are flushed at the end of the range that produced them.
 */
function flushWithDeferredProperties<T>(mount: (deferredProperties: DeferredPropertyBinding[]) => T): T {
	const deferredProperties: DeferredPropertyBinding[] = [];
	const result = mount(deferredProperties);
	flushDeferredProperties(deferredProperties);
	return result;
}

/**
 * Reconnects one template child of a range against the SSR nodes it already owns.
 *
 * Delegates to the full template hydrator instead of reimplementing a reduced
 * version of it, so a child carrying dynamic content reconnects exactly like a
 * root template does rather than being discarded and rebuilt.
 *
 * @param bindingBaseIndex First global SSR marker index owned by this child.
 * @returns The mounted instance, or `undefined` when the child cannot be recovered.
 */
function hydrateTemplateRange(
	template: TemplateResultLike,
	existingNodes: readonly Node[],
	rootTarget: HTMLElement,
	bindingBaseIndex: number,
): TemplateInstance | undefined {
	if (existingNodes.length === 0) {
		return undefined;
	}

	return flushWithDeferredProperties((deferredProperties) =>
		hydrateTemplateInstance(template, rootTarget, deferredProperties, {
			bindingBaseIndex,
			hostRoots: existingNodes,
			rootTarget,
		}),
	);
}

/**
 * Whether the parent can keep the server node of a custom-element child and reconnect its authored template in place.
 *
 * @remarks A custom element's content belongs to the element: SSR serialized it through the render hook, and the
 * element hydrates it itself. A children-value host has no authored DOM children in its template, so the parent binds
 * only the host's own parts and the children value reaches the host's renderer. Other custom elements can be adopted
 * when their tag is defined and authored DOM children are present in the matching server host; hydrating that template
 * keeps the host identity while reconnecting the parent's light-DOM bindings. A late-defined or mismatched host, or an
 * unrecoverable template, still falls back to reconciliation.
 */
function canAdoptCustomElement(template: TemplateResultLike, existingNodes: readonly Node[]): boolean {
	const [host] = existingNodes;
	const localName = template.rootLocalName ?? '';
	const isDefinedCustomElement = Boolean(globalThis.customElements?.get(localName));
	const compiledTemplate = getCompiledTemplate(template);

	return (
		host instanceof Element &&
		host.localName === localName &&
		isDefinedCustomElement &&
		(takesChildrenValue(localName)
			? !compiledTemplate.blueprint.content.firstChild?.hasChildNodes()
			: matchesAuthoredElementChildren(template, host, compiledTemplate))
	);
}

function matchesAuthoredElementChildren(
	template: TemplateResultLike,
	host: Element,
	compiledTemplate: ReturnType<typeof getCompiledTemplate>,
): boolean {
	const childParts = compiledTemplate.parts.filter((part) => part.type === 'child');

	if (childParts.length === 0) {
		return host.children.length === 0;
	}

	if (childParts.length !== 1) {
		return false;
	}

	const childPart = childParts[0];

	if (!childPart) {
		return false;
	}

	const childValue = unwrapKeyedValue(template.values[childPart.index]);

	if (!isTemplateResultLike(childValue) || !childValue.rootLocalName) {
		return host.children.length === 0;
	}

	return host.children.length === 1 && host.children[0]?.localName === childValue.rootLocalName;
}

/**
 * Whether a markerless page template can adopt a tree containing a nested element that already owns its content.
 *
 * @remarks A page can lose every marker of its own when its only dynamic work belongs to a nested element with its
 * own client root, such as a custom element or an island root, whose markers that element consumed when it hydrated,
 * or never had when its view has no binding and it rendered over its server markup. `ownsContent` tells such an
 * element: one with its own client root, which stays across its later renders. It need not be a custom element. The page recovers only when its single static root node and its static content still match, and the
 * page puts nothing inside an element that owns its content; otherwise the normal marker requirement keeps stale
 * HTML on the client-render path.
 */
export function canAdoptMarkerlessTemplate(
	template: TemplateResultLike,
	target: HTMLElement,
	ownsContent: (element: HTMLElement) => boolean,
): boolean {
	const compiledTemplate = getCompiledTemplate(template);
	const blueprintRoot = compiledTemplate.blueprint.content.firstElementChild;
	const actualRoot = target.firstElementChild;

	if (
		!(blueprintRoot instanceof Element) ||
		!(actualRoot instanceof HTMLElement) ||
		compiledTemplate.blueprint.content.childNodes.length !== 1 ||
		compiledTemplate.parts.some((part) => part.type !== 'child') ||
		blueprintRoot.localName !== actualRoot.localName ||
		blueprintRoot.namespaceURI !== actualRoot.namespaceURI ||
		target.childNodes.length !== countHydratedRangeNodes(template)
	) {
		return false;
	}

	let hasOwningElement = false;
	const expectedNodes = materializeExpectedValue(template);

	return (
		expectedNodes !== undefined &&
		matchesExpectedNodes(expectedNodes, Array.from(target.childNodes)) &&
		hasOwningElement
	);

	function materializeExpectedValue(value: unknown): Node[] | undefined {
		const nextValue = unwrapKeyedValue(value);

		if (nextValue == null || typeof nextValue === 'boolean') {
			return [];
		}

		if (isTemplateResultLike(nextValue)) {
			const fragment = getCompiledTemplate(nextValue).blueprint.content.cloneNode(true) as DocumentFragment;
			const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_COMMENT);
			const startMarkers: Comment[] = [];
			let currentNode = walker.nextNode();

			while (currentNode) {
				if (currentNode instanceof Comment && currentNode.data.startsWith(CHILD_BINDING_START_PREFIX)) {
					startMarkers.push(currentNode);
				}

				currentNode = walker.nextNode();
			}

			for (const startMarker of startMarkers) {
				const endMarker = startMarker.nextSibling;

				if (!(endMarker instanceof Comment) || !endMarker.data.startsWith(CHILD_BINDING_END_PREFIX)) {
					return undefined;
				}

				const valueIndex = Number(startMarker.data.slice(CHILD_BINDING_START_PREFIX.length));
				const childNodes = materializeExpectedValue(nextValue.values[valueIndex]);

				if (childNodes === undefined) {
					return undefined;
				}

				startMarker.replaceWith(...childNodes);
				endMarker.remove();
			}

			return Array.from(fragment.childNodes);
		}

		const iterableChildren = getIterableChildren(nextValue);

		if (iterableChildren) {
			const nodes: Node[] = [];

			for (const child of iterableChildren) {
				const childNodes = materializeExpectedValue(child);

				if (childNodes === undefined) {
					return undefined;
				}

				nodes.push(...childNodes);
			}

			return nodes;
		}

		return canRenderAsTextNode(nextValue) ? [document.createTextNode(String(nextValue))] : undefined;
	}

	function matchesExpectedNodes(expectedNodes: readonly Node[], actualNodes: readonly Node[]): boolean {
		if (expectedNodes.length !== actualNodes.length) {
			return false;
		}

		return expectedNodes.every((expectedNode, index) => {
			const actualNode = actualNodes[index];

			if (!actualNode) {
				return false;
			}

			if (expectedNode instanceof Element) {
				if (!(actualNode instanceof Element)) {
					return false;
				}

				if (
					expectedNode.localName !== actualNode.localName ||
					expectedNode.namespaceURI !== actualNode.namespaceURI
				) {
					return false;
				}

				if (actualNode instanceof HTMLElement && ownsContent(actualNode)) {
					hasOwningElement = true;
					return matchesOwningElement(expectedNode, actualNode);
				}

				if (expectedNode.attributes.length !== actualNode.attributes.length) {
					return false;
				}

				for (const attribute of Array.from(expectedNode.attributes)) {
					if (actualNode.getAttributeNS(attribute.namespaceURI, attribute.name) !== attribute.value) {
						return false;
					}
				}

				return matchesExpectedNodes(Array.from(expectedNode.childNodes), Array.from(actualNode.childNodes));
			}

			if (expectedNode instanceof Text) {
				return actualNode instanceof Text && expectedNode.data === actualNode.data;
			}

			return (
				expectedNode instanceof Comment &&
				actualNode instanceof Comment &&
				expectedNode.data === actualNode.data
			);
		});
	}
}

/**
 * @remarks The page may put nothing inside an element that owns its content, since that content is the element's
 * own render; the element's static attributes must still match, ignoring hydration markers.
 */
function matchesOwningElement(expectedNode: Element, actualNode: Element): boolean {
	return (
		!expectedNode.hasChildNodes() &&
		Array.from(expectedNode.attributes).every(
			(attribute) =>
				attribute.name.startsWith('data-radiant-jsx-bind-') ||
				actualNode.getAttributeNS(attribute.namespaceURI, attribute.name) === attribute.value,
		)
	);
}

/**
 * Whether a template puts DOM children inside a custom-element root that is not defined yet, or whose class takes
 * its children as a value (the template was created before the tag was defined).
 *
 * @remarks The element's server markup can hold its own rendered content where the template's children would go,
 * so such a root is rendered rather than hydrated, as before hydration counted the markers inside custom elements.
 * A defined element that takes DOM children keeps hydrating them.
 */
export function fillsRenderedElement(template: TemplateResultLike): boolean {
	const localName = template.rootLocalName ?? '';

	return (
		localName.includes('-') &&
		(!globalThis.customElements?.get(localName) || takesChildrenValue(localName)) &&
		!!getCompiledTemplate(template).blueprint.content.firstChild?.hasChildNodes()
	);
}

/**
 * Wraps each child of an iterable range in its own hydrated sub-range.
 *
 * Keyed and indexed lists walk the SSR nodes identically — only how a child's
 * ownership is recorded differs — so the traversal is shared and the list flavour
 * is decided once, up front.
 *
 * @returns The mounted list state, or `undefined` when the SSR nodes do not line up
 *   with the child values. Partial work is disposed before the caller falls back
 *   to reconciliation, including boundary markers already inserted around recovered
 *   siblings.
 */
function hydrateListRangeContent(
	endMarker: Text,
	children: readonly unknown[],
	existingNodes: readonly Node[],
	rootTarget: HTMLElement,
	bindingBaseIndex: number,
): MountedIndexedList | MountedKeyedList | undefined {
	const keyedChildren = getKeyedChildren(children);
	const indexedRecords: MountedRangeRecord[] = [];
	const keyedRecords = new Map<JsxKey, MountedRangeRecord>();
	const adopted: MountedRangeRecord[] = [];
	let nextNodeIndex = 0;
	let nextBindingIndex = bindingBaseIndex;

	for (const [index, child] of children.entries()) {
		const keyedChild = keyedChildren?.[index];
		const childValue = keyedChild ? keyedChild.value : child;
		const childNodeCount = countHydratedRangeNodes(childValue);
		const childNodes = existingNodes.slice(nextNodeIndex, nextNodeIndex + childNodeCount);

		if (childNodes.length !== childNodeCount) {
			disposeHydratedListRecords(adopted);
			return undefined;
		}

		const record = createHydratedRangeRecord(
			childNodes,
			existingNodes[nextNodeIndex + childNodeCount] ?? endMarker,
		);
		record.mounted = hydrateMountedRangeContent(
			record.start,
			record.end,
			childValue,
			childNodes,
			rootTarget,
			nextBindingIndex,
		);
		nextNodeIndex += childNodeCount;
		// Children are laid out in SSR order, so each consumes the slice of the global
		// marker namespace that its own subtree emitted.
		nextBindingIndex += countHydrationMarkers(childValue as JsxRenderable);
		adopted.push(record);

		if (keyedChild) {
			keyedRecords.set(keyedChild.key, record);
			continue;
		}

		indexedRecords.push(record);
	}

	if (nextNodeIndex !== existingNodes.length) {
		disposeHydratedListRecords(adopted);
		return undefined;
	}

	return keyedChildren
		? { kind: 'keyed-list', records: keyedRecords }
		: { kind: 'indexed-list', records: indexedRecords };
}

function disposeHydratedListRecords(records: readonly MountedRangeRecord[]): void {
	for (const record of records) {
		record.start.remove();
		record.end.remove();
		disposeMountedRangeContent(record.mounted);
	}
}
