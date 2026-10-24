import { countHydrationMarkers } from '../hydration/hydration-bindings.ts';
import { shouldSkipHydrationSubtree } from '../hydration/hydration-subtree-policy.ts';
import { hydrateTemplateInstance } from './hydration.ts';
import { takesChildrenValue } from '../factory/jsx-factory.ts';
import { getCompiledTemplate } from './template-compiler.ts';
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
 * Whether the parent can keep the server node of a custom-element child and bind only the element's own
 * attribute, property, event and children parts to it.
 *
 * @remarks A custom element's content belongs to the element: SSR serialized it through the render hook, in the
 * element's own marker namespace, and the element hydrates it itself. The parent can adopt the node only when
 * its template puts nothing inside the element, which holds when the class takes its children as a value
 * ({@link takesChildrenValue}): the children then reach the element through its children part, and the parent's
 * JSX in them hydrates inside the element's namespace. The host tag carries no marker of the parent's
 * namespace, so binding its parts removes none. Any other custom element (one that takes DOM children, a
 * third-party element, a tag defined only after the view created it) and server markup that is not this
 * element are rebuilt.
 */
function canAdoptCustomElement(template: TemplateResultLike, existingNodes: readonly Node[]): boolean {
	const [host] = existingNodes;
	const localName = template.rootLocalName ?? '';

	return (
		host instanceof Element &&
		host.localName === localName &&
		takesChildrenValue(localName) &&
		!fillsElement(template)
	);
}

/**
 * Whether a template puts DOM children inside a root element whose class now takes its children as a value, as when
 * the template was created before the element's tag was defined.
 *
 * @remarks The element's server markup holds its own rendered content where the template's children would go, so
 * such an element is rebuilt rather than hydrated.
 */
export function fillsValueElement(template: TemplateResultLike): boolean {
	return takesChildrenValue(template.rootLocalName ?? '') && fillsElement(template);
}

function fillsElement(template: TemplateResultLike): boolean {
	return getCompiledTemplate(template).blueprint.content.firstChild?.hasChildNodes() === true;
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
