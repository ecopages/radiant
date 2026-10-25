import { countHydrationMarkers, visitHydrationBindingMarkers } from '../hydration/hydration-bindings.ts';
import { isIterableRenderable, isTemplateResultLike } from '../types/renderable-guards.ts';
import type { JsxRenderable, KeyedJsxValue } from '../types/index.ts';
import { countHydratedRangeNodes, isEmptyTextNode } from './hydration-planning.ts';
import { hydrateTemplateInstance, type HydrateTemplateInstanceOptions } from './hydration.ts';
import { createBoundaryMarker } from './dom-operations.ts';
import { shouldSkipHydrationSubtree } from '../hydration/hydration-subtree-policy.ts';
import { hydrateMountedRangeContent } from './hydration-mounted-range.ts';
import { disposeMountedRangeContent, disposeTemplateInstance } from './mounted-disposal.ts';
import { createHydratedRangeRecord, mountedContentFromNodes } from './range-records.ts';
import { materializeIterableChildren } from '../hydration/iterable-snapshot.ts';
import { getKeyedChildren, unwrapKeyedValue } from './runtime-helpers.ts';
import { isKeyedJsxValue } from '../types/renderable-guards.ts';
import type { DeferredPropertyBinding, MountedRangeContent, MountedRangeRecord, TemplateInstance } from './types.ts';

type HydratedIterableChild = {
	instance?: TemplateInstance;
	mounted?: MountedRangeContent;
	nodes: readonly Node[];
};

function getHydratableChildNodes(target: HTMLElement): readonly ChildNode[] {
	return Array.from(target.childNodes).filter((node) => !(node instanceof HTMLScriptElement));
}

/**
 * Reconnects iterable JSX roots (for example fragments) against existing SSR DOM.
 *
 * Supported shapes:
 * - a flat list of intrinsic template children (`<>...</>` with elements such as
 *   `<button>`, `<span>`, and other single-root templates)
 * - static primitive or markup children mixed between templates
 * - nested lists, such as a mapped list beside a sibling, hydrated as ranges
 * - keyed lists of those children, which keep identity across the next render
 * - mixed keyed and positional lists, which keep keyed identity while positional
 *   entries reconcile by slot
 *
 * Unsupported shapes fall back to a full client render:
 * - bare reactive child sources at the fragment root without a wrapping template
 * - DOM/script child counts that no longer match the JSX child list
 *
 * Success requires every expected hydration marker to be removed from `target`.
 * Recovered template instances stay in the returned ownership tree so later
 * unmount, replacement, and native-listener disposal can walk them. Partial
 * success disposes already-hydrated siblings before the caller falls back.
 *
 * Marker wrapping is delayed until every child has been recovered, unlike nested
 * list hydration which needs range markers while reconnecting reactive children.
 */
export function hydrateIterableRoot(
	value: Iterable<unknown>,
	target: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	options: HydrateTemplateInstanceOptions = {},
): MountedRangeContent | undefined {
	const jsxChildren = materializeIterableChildren(value);
	const keyedChildren = getKeyedChildren(jsxChildren);
	const domChildren = getHydratableChildNodes(target);
	const hydratedChildren: HydratedIterableChild[] = [];
	let domOffset = 0;
	let nextBindingIndex = 0;

	for (const child of jsxChildren) {
		const childValue = unwrapKeyedValue(child);
		const nodeCount = countHydratedRangeNodes(childValue);
		const slice = domChildren.slice(domOffset, domOffset + nodeCount);

		if (slice.length !== nodeCount) {
			disposeHydratedIterableChildren(hydratedChildren);
			return undefined;
		}

		if (isRangedChild(childValue)) {
			hydratedChildren.push(
				reconcileRangedChild(
					childValue,
					slice,
					target,
					domChildren[domOffset] ?? null,
					options.rootTarget ?? target,
					nextBindingIndex,
				),
			);
		} else if (isTemplateResultLike(childValue)) {
			const instance = hydrateTemplateInstance(childValue, target, deferredProperties, {
				...options,
				bindingBaseIndex: nextBindingIndex,
				hostRoots: slice,
				rootTarget: options.rootTarget ?? target,
			});

			if (!instance) {
				disposeHydratedIterableChildren(hydratedChildren);
				return undefined;
			}

			hydratedChildren.push({ instance, nodes: instance.rootNodes });
		} else {
			hydratedChildren.push({ nodes: slice });
		}

		nextBindingIndex += countHydrationMarkers(childValue as JsxRenderable);
		domOffset += nodeCount;
	}

	if (domOffset !== domChildren.length) {
		disposeHydratedIterableChildren(hydratedChildren);
		return undefined;
	}

	if (visitHydrationBindingMarkers(target, () => undefined)) {
		disposeHydratedIterableChildren(hydratedChildren);
		return undefined;
	}

	return adoptHydratedIterableRoot(hydratedChildren, target, jsxChildren, keyedChildren);
}

function isRangedChild(value: unknown): boolean {
	return (
		isIterableRenderable(value) ||
		isEmptyTextNode(value) ||
		(isTemplateResultLike(value) && shouldSkipHydrationSubtree(value.rootLocalName ?? ''))
	);
}

/**
 * Hydrates a custom-element template child, an empty text node or a nested list the way a ranged child is
 * hydrated, so both root shapes treat it alike.
 *
 * @remarks The parent binds only a custom element's own parts and never hydrates into it; an element it cannot
 * adopt is rebuilt. An empty text node has no server node and is inserted. A nested list keeps
 * the boundary markers of its own records inside the returned nodes. The outer boundary markers give the range
 * hydration the start and end it works between; they are removed once the range holds its final nodes. A nested
 * list that rendered no nodes has an empty slice, so its markers go before `referenceNode` in `parent`.
 */
function reconcileRangedChild(
	value: unknown,
	existingNodes: readonly ChildNode[],
	parent: Node,
	referenceNode: Node | null,
	rootTarget: HTMLElement,
	bindingBaseIndex: number,
): HydratedIterableChild {
	const startMarker = createBoundaryMarker();
	const endMarker = createBoundaryMarker();

	if (existingNodes.length === 0) {
		parent.insertBefore(startMarker, referenceNode);
		parent.insertBefore(endMarker, referenceNode);
	} else {
		existingNodes[0]?.before(startMarker);
		existingNodes[existingNodes.length - 1]?.after(endMarker);
	}

	const mounted = hydrateMountedRangeContent(
		startMarker,
		endMarker,
		value,
		existingNodes,
		rootTarget,
		bindingBaseIndex,
	);

	const nodes: ChildNode[] = [];
	for (let node = startMarker.nextSibling; node && node !== endMarker; node = node.nextSibling) {
		nodes.push(node);
	}

	startMarker.remove();
	endMarker.remove();

	return { mounted, nodes };
}

function disposeHydratedIterableChildren(children: readonly HydratedIterableChild[]): void {
	for (const child of children) {
		if (child.instance) {
			disposeTemplateInstance(child.instance);
		} else if (child.mounted) {
			disposeMountedRangeContent(child.mounted);
		}
	}
}

function adoptHydratedIterableRoot(
	children: readonly HydratedIterableChild[],
	target: HTMLElement,
	jsxChildren: readonly unknown[],
	keyedChildren: KeyedJsxValue[] | undefined,
): MountedRangeContent {
	const endMarker = createBoundaryMarker();
	target.append(endMarker);

	const records: MountedRangeRecord[] = [];

	for (const [index, child] of children.entries()) {
		const record = createHydratedRangeRecord(child.nodes, children[index + 1]?.nodes[0] ?? endMarker);
		record.mounted =
			child.mounted ??
			(child.instance ? { instance: child.instance, kind: 'template' } : mountedContentFromNodes(child.nodes));
		records.push(record);
	}

	endMarker.remove();

	if (keyedChildren) {
		return {
			kind: 'keyed-list',
			records: new Map(keyedChildren.map((child, index) => [child.key, records[index]!])),
		};
	}

	return {
		entries: records.map((record, index) => {
			const child = jsxChildren[index];
			return { key: isKeyedJsxValue(child) ? child.key : undefined, record };
		}),
		kind: 'mixed-list',
	};
}
