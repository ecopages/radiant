import { createNodesFromJsxNodeLike } from './dom-operations.ts';
import { getNodeAtPath, getPathKey } from './path-utils.ts';
import { getCompiledTemplate } from './template-compiler.ts';
import {
	canRenderAsTextNode,
	isIterableRenderable,
	isJsxNodeLike,
	isTemplateResultLike,
	resolveReactiveSnapshot,
	unwrapKeyedValue,
} from './runtime-helpers.ts';
import { CHILD_BINDING_END_PREFIX, CHILD_BINDING_START_PREFIX } from './constants.ts';
import type { ChildTemplatePart } from './types.ts';

/** Mapping between a compiled child binding and the concrete node slice found in hydrated DOM. */
export type HydratedChildRange = {
	actualStartIndex: number;
	blueprintStartIndex: number;
	nodeCount: number;
	parentPath: number[];
};

/**
 * Computes the DOM slice that each child binding should own after SSR.
 *
 * The blueprint still includes synthetic comment markers that do not exist in
 * final HTML, so hydration has to translate blueprint indexes into the actual
 * runtime node indexes produced by the resolved child values.
 */
export function collectHydratedChildRanges(
	blueprint: DocumentFragment,
	childParts: readonly ChildTemplatePart[],
	values: readonly unknown[],
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

			const nodeCount = countHydratedRangeNodes(values[part.index]);
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
 * Splits merged text nodes around a hydrated child binding when the browser has
 * collapsed adjacent static and dynamic text into a single text node.
 */
export function isolateHydratedTextRange(
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
 * Counts the DOM nodes `value` produces when mounted, for hydration slice planning.
 *
 * This is a pure structural measurement: it never builds the subtree it measures.
 * Node count is a static property of the value's shape, so each variant is counted
 * from metadata that is already cached (template blueprints) or trivially derived.
 *
 * Reactive sources are resolved to their current snapshot because the SSR serializer
 * resolves them too, so the counted shape matches the emitted HTML.
 */
export function countHydratedRangeNodes(value: unknown): number {
	const resolvedValue = resolveReactiveSnapshot(unwrapKeyedValue(value));

	if (resolvedValue == null || typeof resolvedValue === 'boolean') {
		return 0;
	}

	if (isTemplateResultLike(resolvedValue)) {
		return getCompiledTemplate(resolvedValue).blueprint.content.childNodes.length;
	}

	if (resolvedValue instanceof Node) {
		return 1;
	}

	// Markup stand-ins carry arbitrary HTML, so their node count is only knowable by
	// parsing. This stays cheap: no template instances, listeners, or subscriptions.
	if (isJsxNodeLike(resolvedValue)) {
		return createNodesFromJsxNodeLike(resolvedValue).length;
	}

	if (isIterableRenderable(resolvedValue)) {
		let total = 0;

		for (const child of resolvedValue) {
			total += countHydratedRangeNodes(child);
		}

		return total;
	}

	return 1;
}

function getHydratedNodeContribution(node: Node | undefined): number {
	if (
		node instanceof Comment &&
		(node.data.startsWith(CHILD_BINDING_START_PREFIX) || node.data.startsWith(CHILD_BINDING_END_PREFIX))
	) {
		return 0;
	}

	return node ? 1 : 0;
}

function resolveHydratedRangeValue(value: unknown): unknown {
	return unwrapKeyedValue(resolveReactiveSnapshot(unwrapKeyedValue(value)));
}
