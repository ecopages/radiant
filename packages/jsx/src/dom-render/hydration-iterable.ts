import { collectTemplateAttributeMarkerIndices, visitHydrationBindingMarkers } from '../hydration/hydration-bindings.ts';
import { isIterableRenderable, isTemplateResultLike } from '../types/renderable-guards.ts';
import { countHydratedRangeNodes } from './hydration-planning.ts';
import { hydrateTemplateInstance, type HydrateTemplateInstanceOptions } from './hydration.ts';
import { unwrapKeyedValue } from './runtime-helpers.ts';
import type { DeferredPropertyBinding } from './types.ts';

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
 *
 * Unsupported shapes fall back to a full client render:
 * - nested iterable children (fragments inside fragments)
 * - bare reactive child sources at the fragment root without a wrapping template
 * - DOM/script child counts that no longer match the JSX child list
 *
 * Success requires every expected hydration marker to be removed from `target`.
 */
export function hydrateIterableRoot(
	value: Iterable<unknown>,
	target: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	options: HydrateTemplateInstanceOptions = {},
): boolean {
	const jsxChildren = Array.from(value, (child) => unwrapKeyedValue(child));
	const domChildren = getHydratableChildNodes(target);
	let domOffset = 0;
	let nextBindingIndex = 0;

	for (const child of jsxChildren) {
		const nodeCount = countHydratedRangeNodes(child, target);
		const slice = domChildren.slice(domOffset, domOffset + nodeCount);

		if (slice.length !== nodeCount) {
			return false;
		}

		if (isTemplateResultLike(child)) {
			const attributeBindingIndices = collectTemplateAttributeMarkerIndices(child, nextBindingIndex);
			nextBindingIndex = attributeBindingIndices.nextIndex;
			const instance = hydrateTemplateInstance(child, target, deferredProperties, {
				...options,
				attributeBindingIndices: attributeBindingIndices.indices,
				pathRootOffset: domOffset,
				rootTarget: options.rootTarget ?? target,
			});

			if (!instance) {
				return false;
			}
		} else if (isIterableRenderable(child)) {
			return false;
		}

		domOffset += nodeCount;
	}

	if (domOffset !== domChildren.length) {
		return false;
	}

	return !visitHydrationBindingMarkers(target, () => undefined);
}
