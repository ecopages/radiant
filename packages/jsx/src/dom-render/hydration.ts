import type { KeyedJsxValue, TemplateResultLike } from '../jsx-runtime.ts';
import { createBoundaryMarker } from './dom-operations.ts';
import { clearDelegationRoot } from './event-delegation.ts';
import { getNodeAtPath, getPathKey } from './path-utils.ts';
import {
	canRenderAsTextNode,
	createNodesFromValue,
	flushDeferredProperties,
	getIterableChildren,
	getKeyedChildren,
	isIterableValue,
	isReactiveChildSource,
	isTemplateResultLike,
	readReactiveChildSourceValue,
	subscribeToReactiveChildSource,
	unwrapKeyedValue,
} from './runtime-helpers.ts';
import {
	createHydratedRangeRecord,
	type ReconciliationRuntime,
	updateLiveAttributePart,
	updateRangeContent,
} from './reconciliation.ts';
import { CHILD_BINDING_END_PREFIX, CHILD_BINDING_START_PREFIX } from './constants.ts';
import type {
	AttributeTemplatePart,
	ChildTemplatePart,
	DeferredPropertyBinding,
	LiveAttributePart,
	LiveTemplatePart,
	MountedIndexedList,
	MountedKeyedList,
	MountedRangeContent,
	MountedSubscription,
	TemplateInstance,
	TemplatePart,
} from './types.ts';

/** Mapping between a compiled child binding and the concrete node slice found in hydrated DOM. */
type HydratedChildRange = {
	actualStartIndex: number;
	blueprintStartIndex: number;
	nodeCount: number;
	parentPath: number[];
};

/**
 * Reconstructs a live template instance around existing SSR DOM.
 *
 * Hydration succeeds only when the DOM shape still matches the compiled
 * blueprint closely enough to recover every dynamic part. Callers fall back to
 * a full client render when any required part cannot be recovered.
 */
export function hydrateTemplateInstance(
	template: TemplateResultLike,
	target: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	runtime: ReconciliationRuntime,
): TemplateInstance | undefined {
	const compiledTemplate = runtime.getCompiledTemplate(template);
	const childParts = compiledTemplate.parts.filter((part): part is ChildTemplatePart => part.type === 'child');
	const hydratedChildRanges = collectHydratedChildRanges(
		compiledTemplate.blueprint.content,
		childParts,
		template.values,
		runtime,
	);
	const parts = createHydratedLiveTemplateParts(
		target,
		compiledTemplate.blueprint.content,
		compiledTemplate.parts,
		template.values,
		hydratedChildRanges,
		runtime,
	);

	if (parts.length !== compiledTemplate.parts.length) {
		return undefined;
	}

	const instance: TemplateInstance = {
		compiled: compiledTemplate,
		parts,
		rootTarget: target,
		rootNodes: Array.from(target.childNodes),
		update(values, nextDeferredProperties) {
			for (const part of parts) {
				if (part.type === 'attribute') {
					updateLiveAttributePart(part, values[part.index], nextDeferredProperties, runtime);
					continue;
				}

				part.mounted = updateRangeContent(
					part.startMarker,
					part.endMarker,
					values[part.index],
					part.mounted,
					target,
					nextDeferredProperties,
					runtime,
				);
			}
		},
	};

	for (const part of parts) {
		if (part.type === 'attribute') {
			updateLiveAttributePart(part, template.values[part.index], deferredProperties, runtime);
		}
	}

	return instance;
}

/**
 * Resolves blueprint part metadata against already-existing SSR DOM.
 *
 * Child parts are wrapped with boundary markers inserted around the hydrated
 * content so later updates can treat hydrated and freshly mounted ranges the
 * same way.
 */
function createHydratedLiveTemplateParts(
	target: HTMLElement,
	blueprint: DocumentFragment,
	parts: readonly TemplatePart[],
	values: readonly unknown[],
	hydratedChildRanges: ReadonlyMap<number, HydratedChildRange>,
	runtime: ReconciliationRuntime,
): LiveTemplatePart[] {
	const liveParts = new Map<number, LiveTemplatePart>();
	const childPartEntries = parts
		.map((part, partIndex) => ({ part, partIndex }))
		.filter((entry): entry is { part: ChildTemplatePart; partIndex: number } => entry.part.type === 'child')
		.sort((left, right) => {
			const leftRange = hydratedChildRanges.get(left.part.index);
			const rightRange = hydratedChildRanges.get(right.part.index);

			if (!leftRange || !rightRange) {
				return 0;
			}

			const parentKeyOrder = getPathKey(leftRange.parentPath).localeCompare(getPathKey(rightRange.parentPath));

			if (parentKeyOrder !== 0) {
				return parentKeyOrder;
			}

			return rightRange.actualStartIndex - leftRange.actualStartIndex;
		});

	for (const [partIndex, part] of parts.entries()) {
		if (part.type === 'attribute') {
			const targetNode = getNodeAtPath(target, part.path);

			if (!(targetNode instanceof Element)) {
				continue;
			}

			targetNode.removeAttribute(part.markerName);
			liveParts.set(partIndex, {
				binding: part.binding,
				element: targetNode,
				index: part.index,
				rootTarget: target,
				subscriptionSerial: 0,
				type: 'attribute',
			});
		}
	}

	for (const { part, partIndex } of childPartEntries) {
		const hydratedRange = hydratedChildRanges.get(part.index);

		if (!hydratedRange) {
			continue;
		}

		const parentNode = getNodeAtPath(target, hydratedRange.parentPath);

		if (!parentNode) {
			continue;
		}

		isolateHydratedTextRange(parentNode, blueprint, hydratedRange, values[part.index]);

		const existingNodes = Array.from(parentNode.childNodes).slice(
			hydratedRange.actualStartIndex,
			hydratedRange.actualStartIndex + hydratedRange.nodeCount,
		);
		const startMarker = createBoundaryMarker();
		const endMarker = createBoundaryMarker();

		if (existingNodes.length === 0) {
			const referenceNode = parentNode.childNodes[hydratedRange.actualStartIndex] ?? null;
			if (referenceNode) {
				referenceNode.before(startMarker, endMarker);
			} else {
				parentNode.insertBefore(startMarker, null);
				parentNode.insertBefore(endMarker, null);
			}
		} else {
			existingNodes[0]?.before(startMarker);
			existingNodes[existingNodes.length - 1]?.after(endMarker);
		}

		liveParts.set(partIndex, {
			endMarker,
			index: part.index,
			mounted: hydrateMountedRangeContent(
				startMarker,
				endMarker,
				values[part.index],
				existingNodes,
				target,
				runtime,
			),
			startMarker,
			type: 'child',
		});
	}

	return parts.map((_, index) => liveParts.get(index)).filter((part): part is LiveTemplatePart => part !== undefined);
}

/**
 * Computes the DOM slice that each child binding should own after SSR.
 *
 * The blueprint still includes synthetic comment markers that do not exist in
 * final HTML, so hydration has to translate blueprint indexes into the actual
 * runtime node indexes produced by the resolved child values.
 */
function collectHydratedChildRanges(
	blueprint: DocumentFragment,
	childParts: readonly ChildTemplatePart[],
	values: readonly unknown[],
	runtime: ReconciliationRuntime,
): Map<number, HydratedChildRange> {
	const ranges = new Map<number, HydratedChildRange>();
	const childPartsByParent = new Map<string, ChildTemplatePart[]>();

	for (const part of childParts) {
		const parentPath = part.startPath.slice(0, -1);
		const parentKey = getPathKey(parentPath);
		const partsForParent = childPartsByParent.get(parentKey) ?? [];
		partsForParent.push(part);
		childPartsByParent.set(parentKey, partsForParent);
	}

	for (const [parentKey, partsForParent] of childPartsByParent) {
		const parentPath = parentKey === '' ? [] : parentKey.split('.').map((segment) => Number(segment));
		const parentNode = getNodeAtPath(blueprint, parentPath);

		if (!parentNode) {
			continue;
		}

		const partByStartIndex = new Map(
			partsForParent.map((part) => [part.startPath[part.startPath.length - 1] ?? -1, part]),
		);
		let actualIndex = 0;

		for (let blueprintIndex = 0; blueprintIndex < parentNode.childNodes.length; blueprintIndex += 1) {
			const part = partByStartIndex.get(blueprintIndex);

			if (!part) {
				actualIndex += getHydratedNodeContribution(parentNode.childNodes[blueprintIndex]);
				continue;
			}

			const nodeCount = countHydratedRangeNodes(values[part.index], runtime, parentNode);
			ranges.set(part.index, {
				actualStartIndex: actualIndex,
				blueprintStartIndex: part.startPath[part.startPath.length - 1] ?? 0,
				nodeCount,
				parentPath,
			});
			actualIndex += nodeCount;
			blueprintIndex += 1;
		}
	}

	return ranges;
}

/**
 * Returns the number of real DOM nodes a single blueprint child node contributes
 * to the hydrated tree.
 *
 * Synthetic comment markers written by the compiler (`radiant-jsx-child-*`) are
 * omitted from the final HTML, so they contribute zero nodes. Every other node
 * contributes exactly one.
 *
 * @param node Blueprint child node to evaluate.
 */
function getHydratedNodeContribution(node: Node | undefined): number {
	if (
		node instanceof Comment &&
		(node.data.startsWith(CHILD_BINDING_START_PREFIX) || node.data.startsWith(CHILD_BINDING_END_PREFIX))
	) {
		return 0;
	}

	return node ? 1 : 0;
}

/**
 * Counts the number of real DOM nodes that `value` would produce when mounted.
 *
 * Used during hydration planning to slice the correct portion of the existing
 * DOM for each child binding without actually mounting new nodes.
 *
 * @param value JSX value whose node count should be estimated.
 */
function countHydratedRangeNodes(value: unknown, runtime: ReconciliationRuntime, contextParent: Node | null): number {
	const rootTarget = document.createElement('div');
	const nodes = createNodesFromValue(value, rootTarget, [], runtime.createTemplateInstance, contextParent);
	clearDelegationRoot(rootTarget);
	return nodes.length;
}

/**
 * Splits merged text nodes around a hydrated child binding when the browser has
 * collapsed adjacent static and dynamic text into a single text node.
 *
 * Without this normalization, later text updates would overwrite surrounding
 * static content that happened to share the same DOM text node after HTML
 * parsing.
 */
function isolateHydratedTextRange(
	parentNode: Node,
	blueprint: DocumentFragment,
	hydratedRange: HydratedChildRange,
	value: unknown,
): void {
	const resolvedValue = resolveHydratedRangeValue(value);

	if (!canRenderAsTextNode(resolvedValue) || hydratedRange.nodeCount !== 1) {
		return;
	}

	if (parentNode.childNodes[hydratedRange.actualStartIndex] instanceof Text) {
		return;
	}

	const blueprintParentNode = getNodeAtPath(blueprint, hydratedRange.parentPath);

	if (!blueprintParentNode) {
		return;
	}

	const prefixNode = blueprintParentNode.childNodes[hydratedRange.blueprintStartIndex - 1];
	const suffixNode = blueprintParentNode.childNodes[hydratedRange.blueprintStartIndex + 2];
	const prefix = prefixNode instanceof Text ? prefixNode.data : '';
	const suffix = suffixNode instanceof Text ? suffixNode.data : '';
	let candidateNode = parentNode.childNodes[hydratedRange.actualStartIndex];

	if (!(candidateNode instanceof Text) && hydratedRange.actualStartIndex > 0) {
		candidateNode = parentNode.childNodes[hydratedRange.actualStartIndex - 1];
	}

	if (!(candidateNode instanceof Text)) {
		return;
	}

	let dynamicNode = candidateNode;

	if (prefix && dynamicNode.data.startsWith(prefix)) {
		dynamicNode = dynamicNode.splitText(prefix.length);
	}

	if (suffix && dynamicNode.data.endsWith(suffix)) {
		dynamicNode.splitText(dynamicNode.data.length - suffix.length);
	}
}

/**
 * Unwraps a JSX value to its concrete leaf for hydration planning purposes.
 *
 * Strips keyed wrappers and resolves subscribable values to their current snapshot
 * so helpers that only need the concrete shape (e.g. node-count estimation) do not
 * need to handle wrapper types explicitly.
 *
 * @param value Raw value from a template's `values` array.
 * @returns The unwrapped concrete value.
 */
function resolveHydratedRangeValue(value: unknown): unknown {
	const nextValue = unwrapKeyedValue(value);
	return isReactiveChildSource(nextValue) ? unwrapKeyedValue(readReactiveChildSourceValue(nextValue)) : nextValue;
}

/**
 * Rebuilds mounted range bookkeeping around hydrated nodes.
 *
 * The goal is to preserve SSR DOM identity where possible while still restoring
 * the richer runtime structures needed for subscriptions, grouped children, and
 * nested template updates.
 */
function hydrateMountedRangeContent(
	startMarker: Text,
	endMarker: Text,
	value: unknown,
	existingNodes: readonly Node[],
	rootTarget: HTMLElement,
	runtime: ReconciliationRuntime,
): MountedRangeContent {
	const nextValue = unwrapKeyedValue(value);

	if (isReactiveChildSource(nextValue)) {
		const mountedSubscription: MountedSubscription = {
			kind: 'subscription',
			mounted: hydrateMountedRangeContent(
				startMarker,
				endMarker,
				readReactiveChildSourceValue(nextValue),
				existingNodes,
				rootTarget,
				runtime,
			),
			source: nextValue,
			subscriptionSerial: 0,
			unsubscribe: () => undefined,
		};

		mountedSubscription.unsubscribe = subscribeReactiveHydratedValue(
			nextValue,
			startMarker,
			endMarker,
			mountedSubscription,
			rootTarget,
			runtime,
		);

		return mountedSubscription;
	}

	if (isTemplateResultLike(nextValue)) {
		const hydratedTemplateInstance = hydrateStaticTemplateRange(
			nextValue,
			existingNodes,
			startMarker,
			endMarker,
			rootTarget,
			runtime,
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
			const hydratedKeyedState = hydrateKeyedRangeContent(
				endMarker,
				keyedChildren,
				existingNodes,
				rootTarget,
				runtime,
			);

			if (hydratedKeyedState) {
				return hydratedKeyedState;
			}
		}

		const hydratedIndexedState = hydrateIndexedRangeContent(
			endMarker,
			iterableChildren,
			existingNodes,
			rootTarget,
			runtime,
		);

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
			runtime,
		);
		flushDeferredProperties(nextDeferredProperties);
		return mounted;
	}

	if (nextValue === undefined || nextValue === null || nextValue === false) {
		return { kind: 'empty' };
	}

	if (existingNodes.length === 1 && existingNodes[0] instanceof Text && canRenderAsTextNode(nextValue)) {
		return { kind: 'text', node: existingNodes[0] };
	}

	return existingNodes.length === 0 ? { kind: 'empty' } : { kind: 'nodes', nodes: existingNodes };
}

function subscribeReactiveHydratedValue(
	source: MountedSubscription['source'],
	startMarker: Text,
	endMarker: Text,
	mountedSubscription: MountedSubscription,
	rootTarget: HTMLElement,
	runtime: ReconciliationRuntime,
): () => void {
	const subscriptionSerial = mountedSubscription.subscriptionSerial + 1;
	mountedSubscription.subscriptionSerial = subscriptionSerial;

	return subscribeToReactiveChildSource(source, (nextChildValue) => {
		if (mountedSubscription.subscriptionSerial !== subscriptionSerial || mountedSubscription.source !== source) {
			return;
		}

		const nextDeferredProperties: DeferredPropertyBinding[] = [];
		mountedSubscription.mounted = updateRangeContent(
			startMarker,
			endMarker,
			nextChildValue,
			mountedSubscription.mounted,
			rootTarget,
			nextDeferredProperties,
			runtime,
		);
		flushDeferredProperties(nextDeferredProperties);
	});
}

/**
 * Attempts to reconstruct a {@link TemplateInstance} from an existing SSR node slice
 * that has only attribute parts (no child slots).
 *
 * Attribute-only templates can be hydrated in place because there are no child node
 * boundaries to locate. Returns `undefined` when the template has child parts, causing
 * the caller to fall back to a full re-mount.
 *
 * @param template Template result whose shape to match against existing nodes.
 * @param existingNodes SSR nodes that should correspond to the template root.
 * @param startMarker Boundary start marker already inserted around `existingNodes`.
 * @param endMarker Boundary end marker already inserted around `existingNodes`.
 */
function hydrateStaticTemplateRange(
	template: TemplateResultLike,
	existingNodes: readonly Node[],
	startMarker: Text,
	endMarker: Text,
	rootTarget: HTMLElement,
	runtime: ReconciliationRuntime,
): TemplateInstance | undefined {
	const compiledTemplate = runtime.getCompiledTemplate(template);
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
		update(values, deferredProperties) {
			for (const part of parts) {
				updateLiveAttributePart(part, values[part.index], deferredProperties, runtime);
			}
		},
	};

	return instance;
}

/**
 * Reconstructs a {@link MountedIndexedList} from an existing SSR node slice.
 *
 * Each child's expected node count is computed and used to slice the existing nodes
 * into per-child groups. Returns `undefined` when the total node count does not match,
 * signalling that a fresh mount is needed.
 *
 * @param endMarker End boundary marker of the parent range.
 * @param children Positional children from the current render pass.
 * @param existingNodes SSR nodes owned by the parent range.
 */
function hydrateIndexedRangeContent(
	endMarker: Text,
	children: readonly unknown[],
	existingNodes: readonly Node[],
	rootTarget: HTMLElement,
	runtime: ReconciliationRuntime,
): MountedIndexedList | undefined {
	const records = [];
	let nextNodeIndex = 0;

	for (const child of children) {
		const childNodeCount = countHydratedRangeNodes(child, runtime, endMarker.parentNode);
		const childNodes = existingNodes.slice(nextNodeIndex, nextNodeIndex + childNodeCount);

		if (childNodes.length !== childNodeCount) {
			return undefined;
		}

		const record = createHydratedRangeRecord(
			childNodes,
			existingNodes[nextNodeIndex + childNodeCount] ?? endMarker,
		);
		record.mounted = hydrateMountedRangeContent(record.start, record.end, child, childNodes, rootTarget, runtime);
		records.push(record);
		nextNodeIndex += childNodeCount;
	}

	if (nextNodeIndex !== existingNodes.length) {
		return undefined;
	}

	return { kind: 'indexed-list', records };
}

/**
 * Reconstructs a {@link MountedKeyedList} from an existing SSR node slice.
 *
 * Each keyed child's expected node count is used to slice `existingNodes` in order.
 * Returns `undefined` when the total node count does not match the SSR output.
 *
 * @param endMarker End boundary marker of the parent range.
 * @param children Keyed children from the current render pass.
 * @param existingNodes SSR nodes owned by the parent range.
 */
function hydrateKeyedRangeContent(
	endMarker: Text,
	children: readonly KeyedJsxValue[],
	existingNodes: readonly Node[],
	rootTarget: HTMLElement,
	runtime: ReconciliationRuntime,
): MountedKeyedList | undefined {
	const records = new Map();
	const order = [];
	let nextNodeIndex = 0;

	for (const child of children) {
		const childNodeCount = countHydratedRangeNodes(child.value, runtime, endMarker.parentNode);
		const childNodes = existingNodes.slice(nextNodeIndex, nextNodeIndex + childNodeCount);

		if (childNodes.length !== childNodeCount) {
			return undefined;
		}

		const record = createHydratedRangeRecord(
			childNodes,
			existingNodes[nextNodeIndex + childNodeCount] ?? endMarker,
		);
		record.mounted = hydrateMountedRangeContent(
			record.start,
			record.end,
			child.value,
			childNodes,
			rootTarget,
			runtime,
		);
		records.set(child.key, record);
		order.push(child.key);
		nextNodeIndex += childNodeCount;
	}

	if (nextNodeIndex !== existingNodes.length) {
		return undefined;
	}

	return { kind: 'keyed-list', order, records };
}

/**
 * Builds a synthetic root object whose `childNodes` spans the nodes between two
 * boundary markers inside their shared parent.
 *
 * Used by {@link hydrateStaticTemplateRange} so path-resolution helpers can walk
 * child-index paths relative to a hydrated range without needing to work from the
 * true document root. The child list is reconstructed by walking siblings between
 * the two markers instead of indexing into the full parent child-node list.
 *
 * @param startMarker Start boundary marker.
 * @param endMarker End boundary marker.
 */
function createHydratedRangeRoot(startMarker: Text, endMarker: Text): { childNodes: readonly ChildNode[] } {
	const parentNode = startMarker.parentNode;

	if (!parentNode || parentNode !== endMarker.parentNode) {
		return { childNodes: [] };
	}

	const childNodes = collectNodesBetweenMarkers(startMarker, endMarker);

	return { childNodes };
}

/**
 * Collects the sibling nodes that sit strictly between `startMarker` and `endMarker`.
 *
 * This avoids copying the full `parentNode.childNodes` list when hydration only
 * needs the bounded range owned by the current template fragment.
 *
 * @param startMarker Start boundary marker.
 * @param endMarker End boundary marker.
 * @returns Ordered child nodes between the two markers.
 */
function collectNodesBetweenMarkers(startMarker: Text, endMarker: Text): readonly ChildNode[] {
	const nodes: ChildNode[] = [];
	let currentNode = startMarker.nextSibling;

	while (currentNode && currentNode !== endMarker) {
		nodes.push(currentNode);
		currentNode = currentNode.nextSibling;
	}

	return nodes;
}
