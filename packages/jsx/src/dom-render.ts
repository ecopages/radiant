import { type JsxRenderable, type TemplateResultLike } from './jsx-runtime.ts';
import {
	ATTRIBUTE_BINDING_PREFIX,
	collectHydrationBindings,
	parseBindingDescriptor,
	visitHydrationBindingMarkers,
} from './hydration-bindings.ts';
import {
	HYDRATION_INVALID_BINDING_INDEX_WARNING,
	HYDRATION_MALFORMED_BINDING_DESCRIPTOR_WARNING,
	HYDRATION_MISSING_BINDING_WARNING,
	warnRuntime,
} from './dev-warnings.ts';
import { captureFocusSnapshot, restoreFocusSnapshot } from './dom-render/focus-snapshot.ts';
import { hydrateIterableRoot } from './dom-render/hydration-iterable.ts';
import { hydrateTemplateInstance } from './dom-render/hydration.ts';
import { applyAttributeBinding, disposeMountedRoot } from './dom-render/reconciliation.ts';
import {
	createNodesFromValue,
	flushDeferredProperties,
	isTemplateResultLike,
	unwrapKeyedValue,
} from './dom-render/runtime-helpers.ts';
import { isIterableRenderable } from './renderable-guards.ts';
import { getCompiledTemplate } from './dom-render/template-compiler.ts';
import { createTemplateInstance } from './dom-render/template-instance.ts';
import type { DeferredPropertyBinding, MountedRoot, TemplateInstance } from './dom-render/types.ts';
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

type TemplateHydrationOutcome =
	| {
			deferredProperties: DeferredPropertyBinding[];
			focusSnapshot: ReturnType<typeof captureFocusSnapshot>;
			instance: TemplateInstance;
			kind: 'safe-reconnect';
	  }
	| {
			kind: 'recoverable-mismatch';
	  }
	| {
			kind: 'full-rerender';
	  };

type FlatHydrationOutcome =
	| {
			deferredProperties: DeferredPropertyBinding[];
			focusSnapshot: ReturnType<typeof captureFocusSnapshot>;
			kind: 'safe-reconnect';
	  }
	| {
			kind: 'full-rerender';
	  };

type IterableHydrationOutcome =
	| {
			deferredProperties: DeferredPropertyBinding[];
			focusSnapshot: ReturnType<typeof captureFocusSnapshot>;
			kind: 'safe-reconnect';
	  }
	| {
			kind: 'recoverable-mismatch';
	  }
	| {
			kind: 'full-rerender';
	  };

/**
 * Renders a JSX value into a target element.
 *
 * Template results now keep a live instance when the template shape is stable,
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
		ROOT_RENDER_STATE.set(target, { kind: 'value' });
	}

	flushDeferredProperties(deferredProperties);

	restoreFocusSnapshot(target, focusSnapshot);
}

/**
 * Hydrates an SSR-rendered JSX subtree by attaching event and property bindings in place.
 */
export function hydrate(element: JsxRenderable, target: HTMLElement): void {
	const currentRenderState = ROOT_RENDER_STATE.get(target);

	if (currentRenderState) {
		disposeMountedRoot(currentRenderState);
	}

	ROOT_RENDER_STATE.delete(target);

	const nextValue = unwrapKeyedValue(element);

	if (isTemplateResultLike(nextValue)) {
		const outcome = attemptTemplateHydration(nextValue, target);

		switch (outcome.kind) {
			case 'full-rerender':
			case 'recoverable-mismatch':
				render(element, target);
				return;

			case 'safe-reconnect':
				ROOT_RENDER_STATE.set(target, { instance: outcome.instance, kind: 'template' });
				flushDeferredProperties(outcome.deferredProperties);
				restoreFocusSnapshot(target, outcome.focusSnapshot);
				return;
		}
	}

	if (isIterableRenderable(nextValue)) {
		const outcome = attemptIterableHydration(nextValue, target);

		switch (outcome.kind) {
			case 'full-rerender':
			case 'recoverable-mismatch':
				render(element, target);
				return;

			case 'safe-reconnect':
				ROOT_RENDER_STATE.set(target, { kind: 'value' });
				flushDeferredProperties(outcome.deferredProperties);
				restoreFocusSnapshot(target, outcome.focusSnapshot);
				return;
		}
	}

	const outcome = attemptFlatHydration(element, target);

	if (outcome.kind === 'full-rerender') {
		render(element, target);
		return;
	}

	flushDeferredProperties(outcome.deferredProperties);
	restoreFocusSnapshot(target, outcome.focusSnapshot);
}

function attemptTemplateHydration(template: TemplateResultLike, target: HTMLElement): TemplateHydrationOutcome {
	if (!hasHydrationMarkers(target)) {
		return { kind: 'full-rerender' };
	}

	const focusSnapshot = captureFocusSnapshot(target);
	const deferredProperties: DeferredPropertyBinding[] = [];
	const instance = hydrateTemplateInstance(template, target, deferredProperties);

	if (!instance) {
		return { kind: 'recoverable-mismatch' };
	}

	return {
		deferredProperties,
		focusSnapshot,
		instance,
		kind: 'safe-reconnect',
	};
}

function attemptIterableHydration(value: Iterable<unknown>, target: HTMLElement): IterableHydrationOutcome {
	if (!hasHydrationMarkers(target)) {
		return { kind: 'full-rerender' };
	}

	const focusSnapshot = captureFocusSnapshot(target);
	const deferredProperties: DeferredPropertyBinding[] = [];

	if (!hydrateIterableRoot(value, target, deferredProperties, { rootTarget: target })) {
		return { kind: 'recoverable-mismatch' };
	}

	return {
		deferredProperties,
		focusSnapshot,
		kind: 'safe-reconnect',
	};
}

function attemptFlatHydration(element: JsxRenderable, target: HTMLElement): FlatHydrationOutcome {
	const focusSnapshot = captureFocusSnapshot(target);
	const deferredProperties: DeferredPropertyBinding[] = [];
	const bindings = collectHydrationBindings(element, { skipNestedCustomElementRoots: true });

	if (
		!visitHydrationBindingMarkers(target, (element, attribute) => {
			const bindingIndex = Number(attribute.name.slice(ATTRIBUTE_BINDING_PREFIX.length));
			const parsedBinding = parseBindingDescriptor(attribute.value);
			element.removeAttribute(attribute.name);

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

			applyAttributeBinding(element, parsedBinding, binding.value, target, deferredProperties);
		})
	) {
		return { kind: 'full-rerender' };
	}

	return {
		deferredProperties,
		focusSnapshot,
		kind: 'safe-reconnect',
	};
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
