import {
	HYDRATION_INVALID_BINDING_INDEX_WARNING,
	HYDRATION_MALFORMED_BINDING_DESCRIPTOR_WARNING,
	HYDRATION_MISSING_BINDING_WARNING,
	warnRuntime,
} from '../warnings/dev-warnings.ts';
import {
	ATTRIBUTE_BINDING_PREFIX,
	collectHydrationBindings,
	parseBindingDescriptor,
	visitHydrationBindingMarkers,
} from '../hydration/hydration-bindings.ts';
import { applyBindingToElement } from './bindings.ts';
import type { DeferredPropertyBinding } from './types.ts';
import type { JsxRenderable } from '../types/index.ts';

/**
 * Reconnects SSR bindings by walking marker attributes directly, without
 * reconstructing a template instance.
 *
 * This is the fallback root shape: it handles values that are neither a single
 * template result nor an iterable, and it recovers bindings positionally from the
 * marker indexes embedded during SSR.
 *
 * Markers that cannot be resolved are reported and skipped rather than failing the
 * whole pass, because a single stale marker should not force a full client render.
 *
 * @returns `true` when the subtree carried hydration markers, `false` when a full render is needed.
 */
export function hydrateFlatBindings(
	element: JsxRenderable,
	target: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): boolean {
	const bindings = collectHydrationBindings(element, { skipNestedCustomElementRoots: true });

	return visitHydrationBindingMarkers(target, (markerElement, attribute) => {
		const bindingIndex = Number(attribute.name.slice(ATTRIBUTE_BINDING_PREFIX.length));
		const parsedBinding = parseBindingDescriptor(attribute.value);
		markerElement.removeAttribute(attribute.name);

		if (Number.isNaN(bindingIndex)) {
			warnRuntime(HYDRATION_INVALID_BINDING_INDEX_WARNING, attribute.name, {
				code: `hydrate-invalid-binding-index:${attribute.name}`,
			});
			return;
		}

		if (!parsedBinding) {
			warnRuntime(HYDRATION_MALFORMED_BINDING_DESCRIPTOR_WARNING, attribute.value, {
				code: `hydrate-invalid-binding-descriptor:${attribute.value}`,
			});
			return;
		}

		const binding = bindings.get(bindingIndex);

		if (!binding) {
			warnRuntime(HYDRATION_MISSING_BINDING_WARNING, attribute.name, {
				code: `hydrate-missing-binding:${bindingIndex}`,
			});
			return;
		}

		applyBindingToElement(markerElement, parsedBinding, binding.value, {
			rootTarget: target,
			deferredProperties,
		});
	});
}
