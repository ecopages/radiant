import { captureFocusSnapshot, restoreFocusSnapshot } from './dom-render/focus-snapshot.ts';
import { hydrateFlatBindings } from './dom-render/hydration-flat.ts';
import { hydrateIterableRoot } from './dom-render/hydration-iterable.ts';
import { hydrateTemplateInstance } from './dom-render/hydration.ts';
import { disposeMountedRoot } from './dom-render/mounted-disposal.ts';
import {
	createNodesFromValue,
	flushDeferredProperties,
	isTemplateResultLike,
	unwrapKeyedValue,
} from './dom-render/runtime-helpers.ts';
import { getCompiledTemplate } from './dom-render/template-compiler.ts';
import { createTemplateInstance } from './dom-render/template-instance.ts';
import type { DeferredPropertyBinding, MountedRoot } from './dom-render/types.ts';
import { visitHydrationBindingMarkers } from './hydration/hydration-bindings.ts';
import { isIterableRenderable } from './types/renderable-guards.ts';
import type { JsxRenderable } from './types/index.ts';

/**
 * Per-root render state used to decide whether a subsequent render can update
 * an existing template instance in place or must dispose and remount.
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
 * Template results keep a live instance when the template shape is stable,
 * allowing repeated renders to patch existing parts instead of replacing the
 * whole subtree.
 */
export function render(element: JsxRenderable, target: HTMLElement): void {
	const focusSnapshot = captureFocusSnapshot(target);
	const deferredProperties: DeferredPropertyBinding[] = [];
	const nextValue = unwrapKeyedValue(element);
	const currentRenderState = ROOT_RENDER_STATE.get(target);

	if (isTemplateResultLike(nextValue)) {
		const compiledTemplate = getCompiledTemplate(nextValue);

		if (currentRenderState?.kind === 'template' && currentRenderState.instance.compiled === compiledTemplate) {
			currentRenderState.instance.update(nextValue.values, deferredProperties);
		} else {
			if (currentRenderState) {
				disposeMountedRoot(currentRenderState);
			}

			const instance = createTemplateInstance(nextValue, target, deferredProperties, target);
			target.replaceChildren(...instance.rootNodes);
			ROOT_RENDER_STATE.set(target, { instance, kind: 'template' });
		}
	} else {
		if (currentRenderState) {
			disposeMountedRoot(currentRenderState);
		}

		target.replaceChildren(
			...createNodesFromValue(nextValue, target, deferredProperties, createTemplateInstance, target),
		);
		ROOT_RENDER_STATE.set(target, { kind: 'value', rootTarget: target });
	}

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
	const reconnectedRoot = reconnectSsrRoot(element, target, deferredProperties);

	if (!reconnectedRoot) {
		render(element, target);
		return;
	}

	ROOT_RENDER_STATE.set(target, reconnectedRoot);
	flushDeferredProperties(deferredProperties);
	restoreFocusSnapshot(target, focusSnapshot);
}

/**
 * Reconnects SSR DOM for whichever root shape `element` describes.
 *
 * The three shapes — a single template result, an iterable of children, and the
 * flat marker-walk fallback — differ only in how they locate bindings, so each
 * reports the same way: a mounted root on success, `undefined` to fall back to a
 * full client render.
 *
 * @returns The mounted root state, or `undefined` when the DOM cannot be recovered.
 */
function reconnectSsrRoot(
	element: JsxRenderable,
	target: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): MountedRoot | undefined {
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
			? { kind: 'value', rootTarget: target }
			: undefined;
	}

	return hydrateFlatBindings(element, target, deferredProperties) ? { kind: 'value', rootTarget: target } : undefined;
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
