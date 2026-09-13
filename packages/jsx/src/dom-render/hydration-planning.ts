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
import { materializeIterableChildren } from '../hydration/iterable-snapshot.ts';
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
 * Splits SSR text nodes the browser collapsed across adjacent child bindings.
 *
 * @remarks
 * The SSR serializer emits each child value without separators, so a run of
 * adjacent text-like children serializes into a single text node. Hydration
 * planning assumes one node per text child, so every member of the run would
 * otherwise claim the whole merged node and scramble each other on update.
 * When the merged node's text is exactly the concatenation of the run's
 * serialized values, it is split once per member so each range owns its slice.
 * Runs may bridge empty children (`null`, `undefined`, booleans), which
 * contribute no nodes. Anything that does not match the expected
 * concatenation — merged static text, templates, markup nodes — is left for
 * {@link isolateHydratedTextRange} or the reconciliation fallback.
 */
export function isolateCollapsedAdjacentTextRuns(
	childParts: readonly ChildTemplatePart[],
	values: readonly unknown[],
	ranges: ReadonlyMap<number, HydratedChildRange>,
	resolveParentNode: (path: readonly number[]) => Node | undefined,
): void {
	type RunEntry = { part: ChildTemplatePart; range: HydratedChildRange };

	const partsByParent = new Map<string, RunEntry[]>();

	for (const part of childParts) {
		const range = ranges.get(part.index);

		if (!range) {
			continue;
		}

		const parentKey = getPathKey(range.parentPath);
		const entries = partsByParent.get(parentKey);

		if (entries) {
			entries.push({ part, range });
		} else {
			partsByParent.set(parentKey, [{ part, range }]);
		}
	}

	for (const [parentKey, entries] of partsByParent) {
		const parentPath = parentKey === '' ? [] : parentKey.split('.').map((segment) => Number(segment));
		const parentNode = resolveParentNode(parentPath);

		if (!(parentNode instanceof Element)) {
			continue;
		}

		const ordered = [...entries].sort((left, right) => left.range.actualStartIndex - right.range.actualStartIndex);
		let run: RunEntry[] = [];

		const flushRun = (): void => {
			if (run.length > 1) {
				splitCollapsedTextRun(parentNode, run, values);
			}
			run = [];
		};

		for (const entry of ordered) {
			const nodeCount = entry.range.nodeCount;
			const isSingleText = nodeCount === 1 && isTextRenderableValue(values[entry.part.index]);
			const isEmpty = nodeCount === 0 && isEmptyRenderableValue(values[entry.part.index]);

			if (!isSingleText && !isEmpty) {
				flushRun();
				continue;
			}

			const previous = run[run.length - 1];

			if (
				previous &&
				entry.range.actualStartIndex !== previous.range.actualStartIndex + previous.range.nodeCount
			) {
				flushRun();
			}

			run.push(entry);
		}

		flushRun();
	}
}

/**
 * Splits one collapsed text node so each member of the run owns exactly one node.
 *
 * @remarks Runs only when the candidate node's text equals the concatenation of
 * the run's serialized text values, which makes the split lossless by
 * construction; the resulting node positions match the planned ranges.
 */
function splitCollapsedTextRun(
	parentNode: Element,
	run: { part: ChildTemplatePart; range: HydratedChildRange }[],
	values: readonly unknown[],
): void {
	const textEntries = run.filter((entry) => entry.range.nodeCount === 1);
	const segments = textEntries.map((entry) => serializedChildText(values[entry.part.index]));

	if (segments.some((segment) => segment === null)) {
		return;
	}

	const first = textEntries[0];

	if (!first) {
		return;
	}

	const candidate = parentNode.childNodes[first.range.actualStartIndex];

	if (!(candidate instanceof Text) || candidate.data !== segments.join('')) {
		return;
	}

	let currentNode = candidate;

	for (let index = 1; index < textEntries.length; index += 1) {
		currentNode = currentNode.splitText((segments[index - 1] as string).length);
	}
}

function serializedChildText(value: unknown): string | null {
	const resolved = resolveHydratedRangeValue(value);
	return canRenderAsTextNode(resolved) ? String(resolved) : null;
}

function isTextRenderableValue(value: unknown): boolean {
	return canRenderAsTextNode(resolveHydratedRangeValue(value));
}

function isEmptyRenderableValue(value: unknown): boolean {
	const resolved = resolveHydratedRangeValue(value);
	return resolved === undefined || resolved === null || typeof resolved === 'boolean';
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

		for (const child of materializeIterableChildren(resolvedValue)) {
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
