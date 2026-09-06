import { countHydrationMarkers, visitHydrationBindingMarkers } from '../hydration/hydration-bindings.ts';
import { isIterableRenderable, isTemplateResultLike } from '../types/renderable-guards.ts';
import type { JsxRenderable, KeyedJsxValue } from '../types/index.ts';
import { countHydratedRangeNodes } from './hydration-planning.ts';
import { hydrateTemplateInstance, type HydrateTemplateInstanceOptions } from './hydration.ts';
import { createBoundaryMarker } from './dom-operations.ts';
import { disposeTemplateInstance } from './mounted-disposal.ts';
import { createHydratedRangeRecord, mountedContentFromNodes } from './range-records.ts';
import { getKeyedChildren, unwrapKeyedValue } from './runtime-helpers.ts';
import type { DeferredPropertyBinding, MountedRangeContent, MountedRangeRecord, TemplateInstance } from './types.ts';

type HydratedIterableChild = {
	instance?: TemplateInstance;
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
 * - keyed lists of those children, which keep identity across the next render
 *
 * Unsupported shapes fall back to a full client render:
 * - nested iterable children (fragments inside fragments)
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
	const jsxChildren = Array.from(value);
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

		if (isTemplateResultLike(childValue)) {
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
		} else if (isIterableRenderable(childValue)) {
			disposeHydratedIterableChildren(hydratedChildren);
			return undefined;
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

	return adoptHydratedIterableRoot(hydratedChildren, target, keyedChildren);
}

function disposeHydratedIterableChildren(children: readonly HydratedIterableChild[]): void {
	for (const child of children) {
		if (child.instance) {
			disposeTemplateInstance(child.instance);
		}
	}
}

function adoptHydratedIterableRoot(
	children: readonly HydratedIterableChild[],
	target: HTMLElement,
	keyedChildren: KeyedJsxValue[] | undefined,
): MountedRangeContent {
	const endMarker = createBoundaryMarker();
	target.append(endMarker);

	const records: MountedRangeRecord[] = [];

	for (const [index, child] of children.entries()) {
		const record = createHydratedRangeRecord(child.nodes, children[index + 1]?.nodes[0] ?? endMarker);
		record.mounted = child.instance
			? { instance: child.instance, kind: 'template' }
			: mountedContentFromNodes(child.nodes);
		records.push(record);
	}

	endMarker.remove();

	if (!keyedChildren) {
		return { kind: 'indexed-list', records };
	}

	return {
		kind: 'keyed-list',
		records: new Map(keyedChildren.map((child, index) => [child.key, records[index]!])),
	};
}
