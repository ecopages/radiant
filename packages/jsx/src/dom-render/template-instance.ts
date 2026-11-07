import type { TemplateResultLike } from '../types/index.ts';
import { updateRangeContent } from './child-range-update.ts';
import { getTemplateTree, instantiateTemplateTree } from './template-tree.ts';
import { updateLiveAttributePart } from './live-attribute-update.ts';
import { updateLiveTextContentParts } from './live-text-content-update.ts';
import type { DeferredPropertyBinding, TemplateInstance } from './types.ts';

/**
 * Creates a live template instance from a template result and applies initial values.
 *
 * @param template Compiled JSX template result.
 * @param rootTarget Host element that owns delegated listeners and child reconciliation.
 * @param deferredProperties Queue populated by `.prop` bindings during the initial update.
 * @param contextParent Optional namespace context for cloned fragment nodes.
 * @returns A mounted template instance; {@link updateTemplateInstance} applies later passes.
 */
export function createTemplateInstance(
	template: TemplateResultLike,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	contextParent: Node | null = rootTarget,
): TemplateInstance {
	const instance = instantiateTemplateTree(getTemplateTree(template, contextParent, rootTarget), rootTarget);
	updateTemplateInstance(instance, template.values, deferredProperties);
	return instance;
}

/** Applies a template's next values to a mounted or hydrated instance. */
export function updateTemplateInstance(
	instance: TemplateInstance,
	values: readonly unknown[],
	deferredProperties: DeferredPropertyBinding[],
): void {
	const { parts, rootTarget } = instance;

	for (const part of parts) {
		if (part.type === 'attribute') {
			updateLiveAttributePart(part, values[part.index], deferredProperties);
			continue;
		}

		if (part.type === 'text-content') {
			continue;
		}

		part.mounted = updateRangeContent(part, values[part.index], part.mounted, rootTarget, deferredProperties);
	}

	updateLiveTextContentParts(parts, values);
}
