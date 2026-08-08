import type { JsxKey, TemplateResultLike } from '../types/index.ts';
import { mountReactiveChildSource, updateRangeContent } from './child-range-update.ts';
import { getNodeAtPath } from './path-utils.ts';
import { countHydratedRangeNodes } from './hydration-planning.ts';
import { createHydratedRangeRecord } from './range-records.ts';
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
import { getCompiledTemplate } from './template-compiler.ts';
import { createTemplateInstanceUpdate } from './template-instance.ts';
import type {
	AttributeTemplatePart,
	DeferredPropertyBinding,
	LiveAttributePart,
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
): MountedRangeContent {
	const nextValue = unwrapKeyedValue(value);

	if (isReactiveChildSource(nextValue)) {
		return mountReactiveChildSource(
			startMarker,
			endMarker,
			nextValue,
			createHydratedBootstrapMounted(existingNodes),
			rootTarget,
			[],
		);
	}

	return hydrateMountedRangeContentSnapshot(startMarker, endMarker, nextValue, existingNodes, rootTarget);
}

function hydrateMountedRangeContentSnapshot(
	startMarker: Text,
	endMarker: Text,
	nextValue: unknown,
	existingNodes: readonly Node[],
	rootTarget: HTMLElement,
): MountedRangeContent {
	const bootstrapMounted = createHydratedBootstrapMounted(existingNodes);

	if (isTemplateResultLike(nextValue)) {
		const hydratedTemplateInstance = hydrateStaticTemplateRange(
			nextValue,
			existingNodes,
			startMarker,
			endMarker,
			rootTarget,
		);

		if (hydratedTemplateInstance) {
			flushWithDeferredProperties((deferredProperties) =>
				hydratedTemplateInstance.update(nextValue.values, deferredProperties),
			);
			return { instance: hydratedTemplateInstance, kind: 'template' };
		}
	}

	const iterableChildren = getIterableChildren(nextValue);

	if (iterableChildren) {
		const hydratedListState = hydrateListRangeContent(endMarker, iterableChildren, existingNodes, rootTarget);

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

	if (nextValue === undefined || nextValue === null || nextValue === false) {
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

function createHydratedBootstrapMounted(existingNodes: readonly Node[]): MountedRangeContent {
	if (existingNodes.length === 0) {
		return { kind: 'empty' };
	}

	if (existingNodes.length === 1 && existingNodes[0] instanceof Text) {
		return { kind: 'text', node: existingNodes[0] };
	}

	return { kind: 'nodes', nodes: existingNodes };
}

function hydrateStaticTemplateRange(
	template: TemplateResultLike,
	existingNodes: readonly Node[],
	startMarker: Text,
	endMarker: Text,
	rootTarget: HTMLElement,
): TemplateInstance | undefined {
	const compiledTemplate = getCompiledTemplate(template);
	const attributeParts = compiledTemplate.parts.filter(
		(part): part is AttributeTemplatePart => part.type === 'attribute',
	);

	if (attributeParts.length !== compiledTemplate.parts.length) {
		return undefined;
	}

	const templateRoot = createHydratedRangeRoot(startMarker, endMarker);
	const parts: LiveAttributePart[] = [];

	for (const part of attributeParts) {
		const targetNode = getNodeAtPath(templateRoot, part.path);

		if (!(targetNode instanceof Element)) {
			return undefined;
		}

		targetNode.removeAttribute(part.markerName);
		parts.push({
			binding: part.binding,
			element: targetNode,
			index: part.index,
			rootTarget,
			subscriptionSerial: 0,
			type: 'attribute',
		});
	}

	const instance: TemplateInstance = {
		compiled: compiledTemplate,
		parts,
		rootTarget,
		rootNodes: existingNodes,
		update: createTemplateInstanceUpdate(parts, rootTarget),
	};

	return instance;
}

/**
 * Wraps each child of an iterable range in its own hydrated sub-range.
 *
 * Keyed and indexed lists walk the SSR nodes identically — only how a child's
 * ownership is recorded differs — so the traversal is shared and the list flavour
 * is decided once, up front.
 *
 * @returns The mounted list state, or `undefined` when the SSR nodes do not line up
 *   with the child values, in which case the caller falls back to reconciliation.
 */
function hydrateListRangeContent(
	endMarker: Text,
	children: readonly unknown[],
	existingNodes: readonly Node[],
	rootTarget: HTMLElement,
): MountedIndexedList | MountedKeyedList | undefined {
	const keyedChildren = getKeyedChildren(children);
	const indexedRecords: MountedRangeRecord[] = [];
	const keyedRecords = new Map<JsxKey, MountedRangeRecord>();
	let nextNodeIndex = 0;

	for (const [index, child] of children.entries()) {
		const keyedChild = keyedChildren?.[index];
		const childValue = keyedChild ? keyedChild.value : child;
		const childNodeCount = countHydratedRangeNodes(childValue);
		const childNodes = existingNodes.slice(nextNodeIndex, nextNodeIndex + childNodeCount);

		if (childNodes.length !== childNodeCount) {
			return undefined;
		}

		const record = createHydratedRangeRecord(
			childNodes,
			existingNodes[nextNodeIndex + childNodeCount] ?? endMarker,
		);
		record.mounted = hydrateMountedRangeContent(record.start, record.end, childValue, childNodes, rootTarget);
		nextNodeIndex += childNodeCount;

		if (keyedChild) {
			keyedRecords.set(keyedChild.key, record);
			continue;
		}

		indexedRecords.push(record);
	}

	if (nextNodeIndex !== existingNodes.length) {
		return undefined;
	}

	return keyedChildren
		? { kind: 'keyed-list', records: keyedRecords }
		: { kind: 'indexed-list', records: indexedRecords };
}

function createHydratedRangeRoot(startMarker: Text, endMarker: Text): { childNodes: readonly ChildNode[] } {
	const parentNode = startMarker.parentNode;

	if (!parentNode || parentNode !== endMarker.parentNode) {
		return { childNodes: [] };
	}

	return { childNodes: collectNodesBetweenMarkers(startMarker, endMarker) };
}

function collectNodesBetweenMarkers(startMarker: Text, endMarker: Text): readonly ChildNode[] {
	const nodes: ChildNode[] = [];
	let currentNode = startMarker.nextSibling;

	while (currentNode && currentNode !== endMarker) {
		nodes.push(currentNode);
		currentNode = currentNode.nextSibling;
	}

	return nodes;
}
