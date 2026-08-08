import type { TemplateResultLike } from '../types/index.ts';
import { planTemplateHydrationIndices, resolveHydrationMarkerAttributeName } from '../hydration/hydration-bindings.ts';
import { createBoundaryMarker } from './dom-operations.ts';
import { hydrateMountedRangeContent } from './hydration-mounted-range.ts';
import { collectHydratedChildRanges, isolateHydratedTextRange, type HydratedChildRange } from './hydration-planning.ts';
import { updateLiveAttributePart } from './live-attribute-update.ts';
import { getNodeAtPath, getPathKey } from './path-utils.ts';
import { getCompiledTemplate } from './template-compiler.ts';
import { createTemplateInstanceUpdate } from './template-instance.ts';
import { countHydratedRangeNodes } from './hydration-planning.ts';
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
	 * Supplying them resolves blueprint paths directly against those nodes. The
	 * `pathRootOffset` form has to index into `target.childNodes`, which is O(host
	 * children) per call and therefore quadratic when hydrating a long list.
	 */
	hostRoots?: readonly Node[];
	pathRootOffset?: number;
	rootTarget?: HTMLElement;
};

/** Resolves a blueprint-relative path to the corresponding host node. */
type HostPathResolver = (path: readonly number[]) => Node | undefined;

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
	options: HydrateTemplateInstanceOptions = {},
): TemplateInstance | undefined {
	const pathRootOffset = options.pathRootOffset ?? 0;
	const rootTarget = options.rootTarget ?? target;
	const indexPlan = planTemplateHydrationIndices(template, options.bindingBaseIndex ?? 0);
	const resolveHostNode = createHostPathResolver(target, options.hostRoots, pathRootOffset);
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
		return undefined;
	}

	const nodeCount = countHydratedRangeNodes(template);
	const instance: TemplateInstance = {
		compiled: compiledTemplate,
		parts,
		rootTarget,
		rootNodes: collectRootNodes(target, options.hostRoots, pathRootOffset, nodeCount),
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
 * `hostRoots` addresses the template's root nodes directly, which supports
 * templates owning more than one. The offset form locates a single root
 * positionally, for callers that only know where the slice begins.
 */
function createHostPathResolver(
	target: HTMLElement,
	hostRoots: readonly Node[] | undefined,
	pathRootOffset: number,
): HostPathResolver {
	if (hostRoots) {
		// A blueprint path's first segment selects which root it belongs to; the rest
		// is resolved inside that root.
		return (path) => {
			const root = hostRoots[path[0] ?? 0];

			return !root || path.length <= 1 ? root : getNodeAtPath(root, path.slice(1));
		};
	}

	return (path) => getNodeAtPath(target, path.length === 0 ? [pathRootOffset] : [pathRootOffset, ...path.slice(1)]);
}

/** Collects a template's root nodes without materializing the host's whole child list. */
function collectRootNodes(
	target: HTMLElement,
	hostRoots: readonly Node[] | undefined,
	pathRootOffset: number,
	nodeCount: number,
): Node[] {
	if (hostRoots) {
		return [...hostRoots];
	}

	const rootNodes: Node[] = [];

	for (let index = 0; index < nodeCount; index += 1) {
		const node = target.childNodes[pathRootOffset + index];

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
			const targetNode = resolveHostNode(part.path);

			if (!(targetNode instanceof Element)) {
				continue;
			}

			// Marker names are global, so they come from the index plan rather than the
			// blueprint's local numbering.
			const globalIndex = indexPlan.attributeIndices.get(part.index);

			targetNode.removeAttribute(
				globalIndex === undefined ? part.markerName : resolveHydrationMarkerAttributeName(globalIndex),
			);
			liveParts.set(partIndex, {
				binding: part.binding,
				element: targetNode,
				index: part.index,
				rootTarget,
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

		const parentNode = resolveHostNode(hydratedRange.parentPath);

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
				rootTarget,
				indexPlan.childBaseIndices.get(part.index) ?? 0,
			),
			startMarker,
			type: 'child',
		});
	}

	return parts.map((_, index) => liveParts.get(index)).filter((part): part is LiveTemplatePart => part !== undefined);
}
