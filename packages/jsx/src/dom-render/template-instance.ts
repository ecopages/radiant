import type { TemplateResultLike } from '../types/index.ts';
import {
	createLiveTemplateParts,
	getCompiledTemplate,
	normalizeTemplateFragmentNamespaces,
} from './template-compiler.ts';
import { updateRangeContent } from './child-range-update.ts';
import { updateLiveAttributePart } from './live-attribute-update.ts';
import type { DeferredPropertyBinding, LiveTemplatePart, TemplateInstance } from './types.ts';

/**
 * Creates a live template instance from a template result and applies initial values.
 *
 * @param template Compiled JSX template result.
 * @param rootTarget Host element that owns delegated listeners and child reconciliation.
 * @param deferredProperties Queue populated by `.prop` bindings during the initial update.
 * @param contextParent Optional namespace context for cloned fragment nodes.
 * @returns A mounted template instance with an `update` function for later passes.
 */
export function createTemplateInstance(
	template: TemplateResultLike,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	contextParent: Node | null = rootTarget,
): TemplateInstance {
	const compiledTemplate = getCompiledTemplate(template);
	const fragment = compiledTemplate.blueprint.content.cloneNode(true) as DocumentFragment;
	normalizeTemplateFragmentNamespaces(fragment, contextParent, template.rootLocalName);
	const parts = createLiveTemplateParts(fragment, compiledTemplate.parts, rootTarget);
	const rootNodes = Array.from(fragment.childNodes);
	const update = createTemplateInstanceUpdate(parts, rootTarget);

	const instance: TemplateInstance = {
		compiled: compiledTemplate,
		parts,
		rootTarget,
		rootNodes,
		update,
	};

	instance.update(template.values, deferredProperties);
	return instance;
}

/**
 * Shared update loop for mounted and hydrated template instances.
 *
 * @param parts Live attribute and child-range parts for one template instance.
 * @param rootTarget Host element passed through to child-range reconciliation.
 * @returns An `update` function that applies the next value array.
 */
export function createTemplateInstanceUpdate(
	parts: readonly LiveTemplatePart[],
	rootTarget: HTMLElement,
): (values: readonly unknown[], deferredProperties: DeferredPropertyBinding[]) => void {
	return (values, deferredProperties) => {
		for (const part of parts) {
			if (part.type === 'attribute') {
				updateLiveAttributePart(part, values[part.index], deferredProperties);
				continue;
			}

			part.mounted = updateRangeContent(
				part.startMarker,
				part.endMarker,
				values[part.index],
				part.mounted,
				rootTarget,
				deferredProperties,
			);
		}
	};
}
