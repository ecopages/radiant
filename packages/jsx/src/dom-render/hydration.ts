import type { TemplateResultLike } from '../types/index.ts';
import { planTemplateHydrationIndices, resolveHydrationMarkerAttributeName } from '../hydration/hydration-bindings.ts';
import { createBoundaryMarker } from './dom-operations.ts';
import { hydrateMountedRangeContent } from './hydration-mounted-range.ts';
import {
	collectHydratedChildRanges,
	countHydratedRangeNodes,
	isolateHydratedTextRange,
	type HydratedChildRange,
} from './hydration-planning.ts';
import { updateLiveAttributePart } from './live-attribute-update.ts';
import { disposeLiveTemplateParts } from './mounted-disposal.ts';
import { getNodeAtPath, getPathKey } from './path-utils.ts';
import { getCompiledTemplate } from './template-compiler.ts';
import { createTemplateInstanceUpdate } from './template-instance.ts';
import type { TemplateHydrationIndexPlan } from '../hydration/hydration-bindings.ts';
import type {
	ChildTemplatePart,
	DeferredPropertyBinding,
	LiveTemplatePart,
	TemplateInstance,
	TemplatePart,
} from './types.ts';

export type HydrateTemplateInstanceOptions = {
	/**
	 * First global SSR marker index owned by this template.
	 *
	 * Marker attributes are numbered across the whole document, so a nested template
	 * cannot derive its own names from local value indexes.
	 */
	bindingBaseIndex?: number;
	/**
	 * Root nodes this template already owns in the host DOM, in blueprint order.
	 *
	 * Supplying them resolves blueprint paths directly against those nodes, which
	 * stays O(1) per part when hydrating a long list. When omitted, the hydrator
	 * reads `target.childNodes` in blueprint order instead.
	 */
	hostRoots?: readonly Node[];
	rootTarget?: HTMLElement;
};

/** Resolves a blueprint-relative path to the corresponding host node. */
type HostPathResolver = (path: readonly number[]) => Node | undefined;

/**
 * Reconstructs a live template instance around existing SSR DOM.
 *
 * Hydration succeeds only when the DOM shape still matches the compiled
 * blueprint closely enough to recover every dynamic part. Callers fall back to
 * a full client render when any required part cannot be recovered. Parts that
 * already subscribed before that failure are disposed here so they cannot leak
 * past the fallback render.
 */
export function hydrateTemplateInstance(
	template: TemplateResultLike,
	target: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	options: HydrateTemplateInstanceOptions = {},
): TemplateInstance | undefined {
	const rootTarget = options.rootTarget ?? target;
	const hostRoots = options.hostRoots ?? collectHostChildNodes(target, countHydratedRangeNodes(template));
	const indexPlan = planTemplateHydrationIndices(template, options.bindingBaseIndex ?? 0);
	const resolveHostNode = createHostPathResolver(hostRoots);
	const compiledTemplate = getCompiledTemplate(template);
	const childParts = compiledTemplate.parts.filter((part): part is ChildTemplatePart => part.type === 'child');
	const hydratedChildRanges = collectHydratedChildRanges(
		compiledTemplate.blueprint.content,
		childParts,
		template.values,
	);
	const parts = createHydratedLiveTemplateParts(
		compiledTemplate.blueprint.content,
		compiledTemplate.parts,
		template.values,
		hydratedChildRanges,
		{
			indexPlan,
			resolveHostNode,
			rootTarget,
		},
	);

	if (parts.length !== compiledTemplate.parts.length) {
		disposeLiveTemplateParts(parts);
		return undefined;
	}

	const instance: TemplateInstance = {
		compiled: compiledTemplate,
		parts,
		rootTarget,
		rootNodes: hostRoots,
		update: createTemplateInstanceUpdate(parts, rootTarget),
	};

	for (const part of parts) {
		if (part.type === 'attribute') {
			updateLiveAttributePart(part, template.values[part.index], deferredProperties);
		}
	}

	instance.update(template.values, deferredProperties);

	return instance;
}

/**
 * Builds the path resolver for one hydration pass.
 *
 * The first path segment selects a host root; the rest resolves inside that
 * node. An empty path is the parent of those roots — the blueprint fragment —
 * not the first root itself.
 */
function createHostPathResolver(hostRoots: readonly Node[]): HostPathResolver {
	return (path) => {
		if (path.length === 0) {
			return hostRoots[0]?.parentNode ?? undefined;
		}

		const root = hostRoots[path[0] ?? 0];

		return !root || path.length === 1 ? root : getNodeAtPath(root, path.slice(1));
	};
}

/** Collects a template's root nodes from `target` in blueprint order. */
function collectHostChildNodes(target: HTMLElement, nodeCount: number): Node[] {
	const rootNodes: Node[] = [];

	for (let index = 0; index < nodeCount; index += 1) {
		const node = target.childNodes[index];

		if (node) {
			rootNodes.push(node);
		}
	}

	return rootNodes;
}

function createHydratedLiveTemplateParts(
	blueprint: DocumentFragment,
	parts: readonly TemplatePart[],
	values: readonly unknown[],
	hydratedChildRanges: ReadonlyMap<number, HydratedChildRange>,
	options: {
		indexPlan: TemplateHydrationIndexPlan;
		resolveHostNode: HostPathResolver;
		rootTarget: HTMLElement;
	},
): LiveTemplatePart[] {
	const { indexPlan, resolveHostNode, rootTarget } = options;
	const liveParts = new Map<number, LiveTemplatePart>();

	for (const [partIndex, part] of parts.entries()) {
		const livePart = hydrateElementBoundPart(part, resolveHostNode, indexPlan, rootTarget);

		if (livePart) {
			liveParts.set(partIndex, livePart);
		}
	}

	const childPartEntries = parts
		.map((part, partIndex) => ({ part, partIndex }))
		.filter((entry): entry is { part: ChildTemplatePart; partIndex: number } => entry.part.type === 'child')
		.sort((left, right) => compareHydratedChildPartOrder(left.part, right.part, hydratedChildRanges));

	for (const { part, partIndex } of childPartEntries) {
		const liveChildPart = hydrateChildRangePart(
			part,
			blueprint,
			values,
			hydratedChildRanges,
			resolveHostNode,
			rootTarget,
			indexPlan,
		);

		if (liveChildPart) {
			liveParts.set(partIndex, liveChildPart);
		}
	}

	return parts.map((_, index) => liveParts.get(index)).filter((part): part is LiveTemplatePart => part !== undefined);
}

/** Resolves attribute and text-content parts against the host; child ranges are handled separately. */
function hydrateElementBoundPart(
	part: TemplatePart,
	resolveHostNode: HostPathResolver,
	indexPlan: TemplateHydrationIndexPlan,
	rootTarget: HTMLElement,
): LiveTemplatePart | undefined {
	if (part.type !== 'attribute' && part.type !== 'text-content') {
		return undefined;
	}

	const targetNode = resolveHostNode(part.path);

	if (!(targetNode instanceof Element)) {
		return undefined;
	}

	if (part.type === 'text-content') {
		return {
			committedText: '',
			element: targetNode,
			index: part.index,
			subscriptionSerial: 0,
			type: 'text-content',
		};
	}

	const globalIndex = indexPlan.attributeIndices.get(part.index);

	targetNode.removeAttribute(
		globalIndex === undefined ? part.markerName : resolveHydrationMarkerAttributeName(globalIndex),
	);

	return {
		binding: part.binding,
		element: targetNode,
		index: part.index,
		rootTarget,
		subscriptionSerial: 0,
		type: 'attribute',
	};
}

function compareHydratedChildPartOrder(
	left: ChildTemplatePart,
	right: ChildTemplatePart,
	hydratedChildRanges: ReadonlyMap<number, HydratedChildRange>,
): number {
	const leftRange = hydratedChildRanges.get(left.index);
	const rightRange = hydratedChildRanges.get(right.index);

	if (!leftRange || !rightRange) {
		return 0;
	}

	const parentKeyOrder = getPathKey(leftRange.parentPath).localeCompare(getPathKey(rightRange.parentPath));

	if (parentKeyOrder !== 0) {
		return parentKeyOrder;
	}

	return rightRange.actualStartIndex - leftRange.actualStartIndex;
}

/**
 * Reconnects one compiled child range against SSR DOM.
 *
 * @remarks The parent must be an Element. Any other node type means the tree no
 * longer matches the blueprint, so the part is left unrecovered and the caller
 * falls back to a client render.
 */
function hydrateChildRangePart(
	part: ChildTemplatePart,
	blueprint: DocumentFragment,
	values: readonly unknown[],
	hydratedChildRanges: ReadonlyMap<number, HydratedChildRange>,
	resolveHostNode: HostPathResolver,
	rootTarget: HTMLElement,
	indexPlan: TemplateHydrationIndexPlan,
): LiveTemplatePart | undefined {
	const hydratedRange = hydratedChildRanges.get(part.index);

	if (!hydratedRange) {
		return undefined;
	}

	const parentNode = resolveHostNode(hydratedRange.parentPath);

	if (!(parentNode instanceof Element)) {
		return undefined;
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

	return {
		endMarker,
		index: part.index,
		mounted: hydrateMountedRangeContent(
			startMarker,
			endMarker,
			values[part.index],
			existingNodes,
			rootTarget,
			indexPlan.childBaseIndices.get(part.index) ?? 0,
		),
		startMarker,
		type: 'child',
	};
}
