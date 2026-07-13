import type { TemplateResultLike } from '../jsx-runtime.ts';
import { ATTRIBUTE_BINDING_PREFIX } from '../hydration-bindings.ts';
import { createBoundaryMarker } from './dom-operations.ts';
import { hydrateMountedRangeContent } from './hydration-mounted-range.ts';
import { collectHydratedChildRanges, isolateHydratedTextRange, type HydratedChildRange } from './hydration-planning.ts';
import { updateLiveAttributePart } from './live-attribute-update.ts';
import { getNodeAtPath, getPathKey } from './path-utils.ts';
import { getCompiledTemplate } from './template-compiler.ts';
import { createTemplateInstanceUpdate } from './template-instance.ts';
import { countHydratedRangeNodes } from './hydration-planning.ts';
import type {
	ChildTemplatePart,
	DeferredPropertyBinding,
	LiveTemplatePart,
	TemplateInstance,
	TemplatePart,
} from './types.ts';

export type HydrateTemplateInstanceOptions = {
	attributeBindingIndices?: ReadonlyMap<number, number>;
	pathRootOffset?: number;
	rootTarget?: HTMLElement;
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
	options: HydrateTemplateInstanceOptions = {},
): TemplateInstance | undefined {
	const pathRootOffset = options.pathRootOffset ?? 0;
	const rootTarget = options.rootTarget ?? target;
	const compiledTemplate = getCompiledTemplate(template);
	const childParts = compiledTemplate.parts.filter((part): part is ChildTemplatePart => part.type === 'child');
	const hydratedChildRanges = collectHydratedChildRanges(
		compiledTemplate.blueprint.content,
		childParts,
		template.values,
	);
	const parts = createHydratedLiveTemplateParts(
		target,
		compiledTemplate.blueprint.content,
		compiledTemplate.parts,
		template.values,
		hydratedChildRanges,
		{
			attributeBindingIndices: options.attributeBindingIndices,
			pathRootOffset,
			rootTarget,
		},
	);

	if (parts.length !== compiledTemplate.parts.length) {
		return undefined;
	}

	const nodeCount = countHydratedRangeNodes(template, target);
	const instance: TemplateInstance = {
		compiled: compiledTemplate,
		parts,
		rootTarget,
		rootNodes: Array.from(target.childNodes).slice(pathRootOffset, pathRootOffset + nodeCount),
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

function mapBlueprintPathToHostPath(path: readonly number[], pathRootOffset: number): readonly number[] {
	if (path.length === 0) {
		return [pathRootOffset];
	}

	return [pathRootOffset, ...path.slice(1)];
}

function createHydratedLiveTemplateParts(
	target: HTMLElement,
	blueprint: DocumentFragment,
	parts: readonly TemplatePart[],
	values: readonly unknown[],
	hydratedChildRanges: ReadonlyMap<number, HydratedChildRange>,
	options: {
		attributeBindingIndices?: ReadonlyMap<number, number>;
		pathRootOffset: number;
		rootTarget: HTMLElement;
	},
): LiveTemplatePart[] {
	const { attributeBindingIndices, pathRootOffset, rootTarget } = options;
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
			const targetNode = getNodeAtPath(target, mapBlueprintPathToHostPath(part.path, pathRootOffset));

			if (!(targetNode instanceof Element)) {
				continue;
			}

			const markerName =
				attributeBindingIndices?.get(part.index) === undefined
					? part.markerName
					: `${ATTRIBUTE_BINDING_PREFIX}${attributeBindingIndices.get(part.index)}`;

			targetNode.removeAttribute(markerName);
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

		const parentNode = getNodeAtPath(target, mapBlueprintPathToHostPath(hydratedRange.parentPath, pathRootOffset));

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
			mounted: hydrateMountedRangeContent(startMarker, endMarker, values[part.index], existingNodes, rootTarget),
			startMarker,
			type: 'child',
		});
	}

	return parts.map((_, index) => liveParts.get(index)).filter((part): part is LiveTemplatePart => part !== undefined);
}
