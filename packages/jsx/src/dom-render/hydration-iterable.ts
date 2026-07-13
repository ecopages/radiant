import { needsHydrationMarker } from '../hydration-marker-policy.ts';
import { getTemplateInterpolationParts } from '../template-shape.ts';
import type { TemplateResultLike } from '../jsx-runtime.ts';
import { isIterableRenderable, isTemplateResultLike } from '../renderable-guards.ts';
import { countHydratedRangeNodes } from './hydration-planning.ts';
import { hydrateTemplateInstance, type HydrateTemplateInstanceOptions } from './hydration.ts';
import { unwrapKeyedValue } from './runtime-helpers.ts';
import type { BindingKind } from '../hydration-bindings.ts';
import type { DeferredPropertyBinding, TemplateInstance } from './types.ts';

function getHydratableChildNodes(target: HTMLElement): readonly ChildNode[] {
	return Array.from(target.childNodes).filter((node) => !(node instanceof HTMLScriptElement));
}

function collectTemplateAttributeBindingIndices(
	template: TemplateResultLike,
	startIndex: number,
): { indices: Map<number, number>; nextIndex: number } {
	const indices = new Map<number, number>();
	const interpolationParts = getTemplateInterpolationParts(template.strings);
	let nextIndex = startIndex;

	for (let index = 0; index < template.values.length; index += 1) {
		const interpolationPart = interpolationParts[index];

		if (interpolationPart?.type === 'attribute' && needsHydrationMarker(interpolationPart.kind as BindingKind)) {
			indices.set(index, nextIndex);
			nextIndex += 1;
		}
	}

	return { indices, nextIndex };
}

/**
 * Reconnects every template child inside an iterable JSX root (for example a
 * fragment) against the matching SSR DOM slice on `target`.
 */
export function hydrateIterableRoot(
	value: Iterable<unknown>,
	target: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	options: HydrateTemplateInstanceOptions = {},
): readonly TemplateInstance[] | undefined {
	const jsxChildren = Array.from(value, (child) => unwrapKeyedValue(child));
	const domChildren = getHydratableChildNodes(target);
	const instances: TemplateInstance[] = [];
	let domOffset = 0;
	let nextBindingIndex = 0;

	for (const child of jsxChildren) {
		const nodeCount = countHydratedRangeNodes(child, target);
		const slice = domChildren.slice(domOffset, domOffset + nodeCount);

		if (slice.length !== nodeCount) {
			return undefined;
		}

		if (isTemplateResultLike(child)) {
			const attributeBindingIndices = collectTemplateAttributeBindingIndices(child, nextBindingIndex);
			nextBindingIndex = attributeBindingIndices.nextIndex;
			const instance = hydrateTemplateInstance(child, target, deferredProperties, {
				...options,
				attributeBindingIndices: attributeBindingIndices.indices,
				pathRootOffset: domOffset,
				rootTarget: options.rootTarget ?? target,
			});

			if (!instance) {
				return undefined;
			}

			instances.push(instance);
		} else if (isIterableRenderable(child)) {
			return undefined;
		}

		domOffset += nodeCount;
	}

	if (domOffset !== domChildren.length) {
		return undefined;
	}

	return instances;
}
