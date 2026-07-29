import type { KeyedJsxValue, TemplateResultLike } from '../types/index.ts';
import { mountReactiveChildSource, updateRangeContent } from './child-range-update.ts';
import { getNodeAtPath } from './path-utils.ts';
import { countHydratedRangeNodes } from './hydration-planning.ts';
import { createHydratedRangeRecord } from './range-records.ts';
import {
	canRenderAsTextNode,
	flushDeferredProperties,
	getIterableChildren,
	getKeyedChildren,
	isIterableValue,
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
			const nextDeferredProperties: DeferredPropertyBinding[] = [];
			hydratedTemplateInstance.update(nextValue.values, nextDeferredProperties);
			flushDeferredProperties(nextDeferredProperties);
			return { instance: hydratedTemplateInstance, kind: 'template' };
		}
	}

	const iterableChildren = getIterableChildren(nextValue);

	if (iterableChildren) {
		const keyedChildren = getKeyedChildren(iterableChildren);

		if (keyedChildren) {
			const hydratedKeyedState = hydrateKeyedRangeContent(endMarker, keyedChildren, existingNodes, rootTarget);

			if (hydratedKeyedState) {
				return hydratedKeyedState;
			}
		}

		const hydratedIndexedState = hydrateIndexedRangeContent(endMarker, iterableChildren, existingNodes, rootTarget);

		if (hydratedIndexedState) {
			return hydratedIndexedState;
		}
	}

	if (isTemplateResultLike(nextValue) || isIterableValue(nextValue)) {
		const nextDeferredProperties: DeferredPropertyBinding[] = [];
		const mounted = updateRangeContent(
			startMarker,
			endMarker,
			nextValue,
			existingNodes.length === 0 ? { kind: 'empty' } : { kind: 'nodes', nodes: existingNodes },
			rootTarget,
			nextDeferredProperties,
		);
		flushDeferredProperties(nextDeferredProperties);
		return mounted;
	}

	if (nextValue === undefined || nextValue === null || nextValue === false) {
		const nextDeferredProperties: DeferredPropertyBinding[] = [];
		const mounted = updateRangeContent(
			startMarker,
			endMarker,
			nextValue,
			bootstrapMounted,
			rootTarget,
			nextDeferredProperties,
		);
		flushDeferredProperties(nextDeferredProperties);
		return mounted;
	}

	if (existingNodes.length === 1 && existingNodes[0] instanceof Text && canRenderAsTextNode(nextValue)) {
		const nextDeferredProperties: DeferredPropertyBinding[] = [];
		const mounted = updateRangeContent(
			startMarker,
			endMarker,
			nextValue,
			{ kind: 'text', node: existingNodes[0] },
			rootTarget,
			nextDeferredProperties,
		);
		flushDeferredProperties(nextDeferredProperties);
		return mounted;
	}

	return bootstrapMounted;
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

function hydrateIndexedRangeContent(
	endMarker: Text,
	children: readonly unknown[],
	existingNodes: readonly Node[],
	rootTarget: HTMLElement,
): MountedIndexedList | undefined {
	const records = [];
	let nextNodeIndex = 0;

	for (const child of children) {
		const childNodeCount = countHydratedRangeNodes(child, endMarker.parentNode);
		const childNodes = existingNodes.slice(nextNodeIndex, nextNodeIndex + childNodeCount);

		if (childNodes.length !== childNodeCount) {
			return undefined;
		}

		const record = createHydratedRangeRecord(
			childNodes,
			existingNodes[nextNodeIndex + childNodeCount] ?? endMarker,
		);
		record.mounted = hydrateMountedRangeContent(record.start, record.end, child, childNodes, rootTarget);
		records.push(record);
		nextNodeIndex += childNodeCount;
	}

	if (nextNodeIndex !== existingNodes.length) {
		return undefined;
	}

	return { kind: 'indexed-list', records };
}

function hydrateKeyedRangeContent(
	endMarker: Text,
	children: readonly KeyedJsxValue[],
	existingNodes: readonly Node[],
	rootTarget: HTMLElement,
): MountedKeyedList | undefined {
	const records = new Map();
	let nextNodeIndex = 0;

	for (const child of children) {
		const childNodeCount = countHydratedRangeNodes(child.value, endMarker.parentNode);
		const childNodes = existingNodes.slice(nextNodeIndex, nextNodeIndex + childNodeCount);

		if (childNodes.length !== childNodeCount) {
			return undefined;
		}

		const record = createHydratedRangeRecord(
			childNodes,
			existingNodes[nextNodeIndex + childNodeCount] ?? endMarker,
		);
		record.mounted = hydrateMountedRangeContent(record.start, record.end, child.value, childNodes, rootTarget);
		records.set(child.key, record);
		nextNodeIndex += childNodeCount;
	}

	if (nextNodeIndex !== existingNodes.length) {
		return undefined;
	}

	return { kind: 'keyed-list', records };
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
