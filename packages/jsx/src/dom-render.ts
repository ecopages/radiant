import { updateRangeContent } from './dom-render/child-range-update.ts';
import { createBoundaryMarker } from './dom-render/dom-operations.ts';
import { captureFocusSnapshot, restoreFocusSnapshot } from './dom-render/focus-snapshot.ts';
import { hydrateFlatBindings } from './dom-render/hydration-flat.ts';
import { hydrateIterableRoot } from './dom-render/hydration-iterable.ts';
import { hydrateTemplateInstance } from './dom-render/hydration.ts';
import { disposeMountedRoot } from './dom-render/mounted-disposal.ts';
import { flushDeferredProperties, isTemplateResultLike, unwrapKeyedValue } from './dom-render/runtime-helpers.ts';
import type { DeferredPropertyBinding, MountedRangeContent, MountedRoot } from './dom-render/types.ts';
import { visitHydrationBindingMarkers } from './hydration/hydration-bindings.ts';
import { isIterableRenderable } from './types/renderable-guards.ts';
import type { JsxRenderable } from './types/index.ts';

/**
 * Per-root render state.
 *
 * A mounted root is just a child range that happens to span the whole host, so
 * every root reuses the same reconciliation engine as any nested dynamic slot.
 */
const ROOT_RENDER_STATE = new WeakMap<HTMLElement, MountedRoot>();

/**
 * Imperative handle returned by {@link createRoot} for managing a mounted JSX tree.
 *
 * Provides `render`, `hydrate`, and `unmount` methods so application entry-points can
 * drive the renderer without importing the lower-level `render`/`hydrate` functions
 * directly.
 */
export interface JsxRoot {
	render: (element: JsxRenderable) => void;
	hydrate: (element: JsxRenderable) => void;
	unmount: () => void;
}

/**
 * Renders a JSX value into a target element.
 *
 * The root is reconciled through the same range engine used for nested child
 * slots, so every value shape behaves identically at the root as it does inside a
 * template: stable templates patch in place, keyed lists preserve identity, text
 * updates mutate node data, and reactive sources stay subscribed.
 */
export function render(element: JsxRenderable, target: HTMLElement): void {
	const focusSnapshot = captureFocusSnapshot(target);
	const deferredProperties: DeferredPropertyBinding[] = [];
	const root = getOrCreateMountedRoot(target);

	root.mounted = updateRangeContent(root.start, root.end, element, root.mounted, target, deferredProperties);

	flushDeferredProperties(deferredProperties);
	restoreFocusSnapshot(target, focusSnapshot);
}

/**
 * Hydrates an SSR-rendered JSX subtree by attaching event and property bindings in place.
 *
 * Falls back to a full client render whenever the SSR DOM cannot be reconnected.
 */
export function hydrate(element: JsxRenderable, target: HTMLElement): void {
	const currentRenderState = ROOT_RENDER_STATE.get(target);

	if (currentRenderState) {
		disposeMountedRoot(currentRenderState);
	}

	ROOT_RENDER_STATE.delete(target);

	const focusSnapshot = captureFocusSnapshot(target);
	const deferredProperties: DeferredPropertyBinding[] = [];
	const reconnectedContent = reconnectSsrRoot(element, target, deferredProperties);

	if (!reconnectedContent) {
		render(element, target);
		return;
	}

	ROOT_RENDER_STATE.set(target, adoptHydratedRootRange(target, reconnectedContent));
	flushDeferredProperties(deferredProperties);
	restoreFocusSnapshot(target, focusSnapshot);
}

/**
 * Reconnects SSR DOM for whichever root shape `element` describes.
 *
 * The three shapes — a single template result, an iterable of children, and the
 * flat marker-walk fallback — differ only in how they locate bindings, so each
 * reports the same way: mounted content on success, `undefined` to fall back to a
 * full client render.
 *
 * @returns The reconnected range content, or `undefined` when the DOM cannot be recovered.
 */
function reconnectSsrRoot(
	element: JsxRenderable,
	target: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): MountedRangeContent | undefined {
	const nextValue = unwrapKeyedValue(element);

	if (isTemplateResultLike(nextValue)) {
		if (!hasHydrationMarkers(target)) {
			return undefined;
		}

		const instance = hydrateTemplateInstance(nextValue, target, deferredProperties);
		return instance ? { instance, kind: 'template' } : undefined;
	}

	if (isIterableRenderable(nextValue)) {
		if (!hasHydrationMarkers(target)) {
			return undefined;
		}

		return hydrateIterableRoot(nextValue, target, deferredProperties, { rootTarget: target })
			? { kind: 'nodes', nodes: Array.from(target.childNodes) }
			: undefined;
	}

	return hydrateFlatBindings(element, target, deferredProperties)
		? { kind: 'nodes', nodes: Array.from(target.childNodes) }
		: undefined;
}

function getOrCreateMountedRoot(target: HTMLElement): MountedRoot {
	const existingRoot = ROOT_RENDER_STATE.get(target);

	if (existingRoot) {
		return existingRoot;
	}

	target.replaceChildren();

	const startMarker = createBoundaryMarker();
	const endMarker = createBoundaryMarker();
	target.append(startMarker, endMarker);

	const root: MountedRoot = { end: endMarker, mounted: { kind: 'empty' }, rootTarget: target, start: startMarker };
	ROOT_RENDER_STATE.set(target, root);
	return root;
}

/**
 * Brackets already-hydrated SSR content with boundary markers so later renders
 * reconcile it through the same range engine as a client-mounted root.
 *
 * Markers are added only after reconnection completes, because hydration resolves
 * blueprint paths against the host's original child indexes.
 */
function adoptHydratedRootRange(target: HTMLElement, mounted: MountedRangeContent): MountedRoot {
	const startMarker = createBoundaryMarker();
	const endMarker = createBoundaryMarker();

	target.prepend(startMarker);
	target.append(endMarker);

	return { end: endMarker, mounted, rootTarget: target, start: startMarker };
}

/**
 * Returns `true` when `target` contains at least one element with a hydration-binding
 * attribute marker.
 *
 * Used by {@link hydrate} to decide whether the DOM was produced by an SSR pass that
 * embedded binding descriptors, or whether a full client render is needed instead.
 *
 * @param target Root element to inspect.
 */
export function hasHydrationMarkers(target: HTMLElement): boolean {
	return visitHydrationBindingMarkers(target, () => undefined);
}

/**
 * Creates a small root API for imperative mounting from plain application entrypoints.
 */
export function createRoot(target: HTMLElement): JsxRoot {
	return {
		render(element: JsxRenderable) {
			render(element, target);
		},
		hydrate(element: JsxRenderable) {
			hydrate(element, target);
		},
		unmount() {
			const currentRenderState = ROOT_RENDER_STATE.get(target);

			if (currentRenderState) {
				disposeMountedRoot(currentRenderState);
			}

			ROOT_RENDER_STATE.delete(target);
			target.replaceChildren();
		},
	};
}
