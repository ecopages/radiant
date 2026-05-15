import {
	forEachNormalizedAttribute,
	isKeyedJsxValue,
	isSerializableTemplateResultLike,
	isSubscribableJsxValue,
	isTemplateResultLike,
	renderJsxRenderableToString,
	resolveBindingShapeValue,
	shouldUseAttributeBindingByDefaultForElement,
	shouldUseBooleanAttributeBinding,
	toTemplateResultLike,
	type JsxNodeLike,
	type JsxRenderable,
	type SignalLike,
	type TemplateResultLike,
} from './jsx-runtime.ts';
import {
	ATTRIBUTE_BINDING_PREFIX,
	getTemplateInterpolationParts,
	serializeBindingDescriptor,
} from './hydration-bindings.ts';
import { escapeAttribute, escapeHtml } from './html-escape.ts';
import { createServerRenderedCustomElement as createServerRenderedIntrinsicCustomElement } from './server-rendered-custom-element.ts';
import { getActiveSsrRenderContext, type SsrRenderContext, withActiveSsrRenderContext } from './ssr-render-scope.ts';
import type { ServerCustomElementRenderHook } from './types.ts';

/** Public vocabulary for the SSR output modes supported by `renderToString(...)`. */
export type RenderToStringMode = 'hydrate' | 'plain';

/** Options that control how JSX values are serialized during SSR. */
export type RenderToStringOptions = {
	/**
	 * When `true`, emits hydration binding markers alongside the serialized HTML
	 * so the DOM hydrator can reconnect listeners and property bindings without
	 * replacing the SSR DOM tree.
	 */
	hydrate?: boolean;
	/**
	 * Explicit SSR mode selection. Takes precedence over `hydrate` when both are present.
	 *
	 * - `'plain'` emits plain HTML without hydration binding markers.
	 * - `'hydrate'` emits HTML plus hydration binding markers.
	 */
	mode?: RenderToStringMode;
};

type RenderContext = {
	ssr: SsrRenderContext;
	nextBindingIndex: number;
};

/**
 * Serializes a Radiant JSX value into an HTML string.
 *
 * The renderer resolves keyed and subscribable wrappers transparently, reuses
 * cached interpolation metadata for template results, and optionally embeds
 * hydration descriptors when `options.mode === 'hydrate'`.
 *
 * @param value JSX value to serialize.
 * @param options Controls whether hydration metadata is emitted.
 * @returns HTML string representation of the provided JSX value.
 */
export function renderToString(value: JsxRenderable, options: RenderToStringOptions = {}): string {
	const hydrate = options.mode === 'hydrate' || (options.mode === undefined && options.hydrate === true);
	const activeSsrContext = getActiveSsrRenderContext();
	const ssr: SsrRenderContext = {
		hydrate,
		customElementRenderHook: activeSsrContext?.customElementRenderHook,
		scopeValues: activeSsrContext?.scopeValues,
	};

	return withActiveSsrRenderContext(ssr, () =>
		renderChild(value, {
			ssr,
			nextBindingIndex: 0,
		}),
	);
}

/** Returns whether the active SSR render scope is currently emitting hydration markers. */
export function isServerRenderHydrationActive(): boolean {
	return getActiveSsrRenderContext()?.hydrate === true;
}

/**
 * Runs work with a framework hook that can intercept intrinsic custom-element SSR.
 *
 * Frameworks use this to adapt richer host rendering models, such as
 * `RadiantElement`, without teaching the core JSX renderer about framework-
 * specific element classes.
 */
export function withServerCustomElementRenderHook<T>(hook: ServerCustomElementRenderHook, render: () => T): T {
	return withSsrRenderOverrides({ customElementRenderHook: hook }, render);
}

/**
 * Legacy compatibility wrapper for older integrations that expected an explicit
 * "force custom-element SSR" toggle.
 *
 * The server-render pipeline now owns intrinsic custom-element SSR directly, so
 * this helper only preserves the old call shape and immediately runs `render()`.
 */
export function withForcedServerCustomElementRendering<T>(render: () => T): T {
	return render();
}

function withSsrRenderOverrides<T>(overrides: Partial<SsrRenderContext>, render: () => T): T {
	const parentContext = getActiveSsrRenderContext();
	const nextContext: SsrRenderContext = {
		hydrate: overrides.hydrate ?? parentContext?.hydrate ?? false,
		customElementRenderHook: overrides.customElementRenderHook ?? parentContext?.customElementRenderHook,
		scopeValues: parentContext?.scopeValues,
	};

	return withActiveSsrRenderContext(nextContext, render);
}

function renderChild(value: JsxRenderable, context: RenderContext): string {
	if (value === undefined || value === null || value === false) {
		return '';
	}

	if (isKeyedJsxValue(value)) {
		return renderChild(value.value, context);
	}

	if (isSubscribableJsxValue(value)) {
		return renderChild(value.getValue(), context);
	}

	if (isSignalLikeValue(value)) {
		return renderChild(value.get(), context);
	}

	if (typeof value === 'string') {
		return escapeHtml(value);
	}

	if (typeof value === 'number' || typeof value === 'bigint') {
		return String(value);
	}

	if (value === true) {
		return '';
	}

	if (isTemplateResultLike(value) || isSerializableTemplateResultLike(value)) {
		return renderTemplateResult(toTemplateResultLike(value), context);
	}

	if (isNodeLike(value)) {
		return renderNodeLike(value);
	}

	if (isIterable(value)) {
		let html = '';

		for (const child of value) {
			html += renderChild(child as JsxRenderable, context);
		}

		return html;
	}

	return escapeHtml(String(value));
}

function renderTemplateResult(template: TemplateResultLike, context: RenderContext): string {
	if (template.rootLocalName?.includes('-') && template.ssrIntrinsicProps) {
		const serverRenderedCustomElement = createServerRenderedIntrinsicCustomElement(
			template.rootLocalName,
			template.ssrIntrinsicProps,
			{
				forEachNormalizedAttribute,
				renderValueToString: renderJsxRenderableToString,
				resolveBindingShapeValue,
				shouldUseAttributeBindingByDefaultForElement,
				shouldUseBooleanAttributeBinding,
			},
		);

		if (serverRenderedCustomElement) {
			return renderNodeLike(serverRenderedCustomElement);
		}
	}

	const interpolationParts = getTemplateInterpolationParts(template.strings);
	let html = '';

	for (let index = 0; index < template.values.length; index += 1) {
		const interpolationPart = interpolationParts[index];
		const value = resolveReactiveSnapshot(template.values[index]);

		if (!interpolationPart || interpolationPart.type === 'child') {
			html +=
				interpolationPart && interpolationPart.type === 'child'
					? interpolationPart.string
					: (template.strings[index] ?? '');
			html += renderChild(value as JsxRenderable, context);
			continue;
		}

		const bindingKind = interpolationPart.kind;
		const bindingIndex = context.nextBindingIndex;
		html += interpolationPart.leading;

		if (context.ssr.hydrate) {
			html += `${interpolationPart.whitespace}${ATTRIBUTE_BINDING_PREFIX}${bindingIndex}="${serializeBindingDescriptor(bindingKind, interpolationPart.name)}"`;
		}

		context.nextBindingIndex += 1;

		if (interpolationPart.prefix === '@' || interpolationPart.prefix === '!' || interpolationPart.prefix === '.') {
			continue;
		}

		if (interpolationPart.prefix === '?') {
			if (value) {
				html += `${interpolationPart.whitespace}${interpolationPart.name}`;
			}
			continue;
		}

		if (value === undefined || value === null || value === false) {
			continue;
		}

		html += `${interpolationPart.whitespace}${interpolationPart.name}="${escapeAttribute(String(value))}"`;
	}

	html += template.strings[template.strings.length - 1] ?? '';
	return html;
}

function isSignalLikeValue(value: unknown): value is SignalLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as Partial<SignalLike>).get === 'function' &&
		typeof (value as Partial<SignalLike>).subscribe === 'function'
	);
}

function resolveReactiveSnapshot(value: unknown): unknown {
	if (isSubscribableJsxValue(value)) {
		return resolveReactiveSnapshot(value.getValue());
	}

	if (isSignalLikeValue(value)) {
		return resolveReactiveSnapshot(value.get());
	}

	return value;
}

function renderNodeLike(node: JsxNodeLike): string {
	const outerHTML = node.outerHTML;

	if (typeof outerHTML === 'string') {
		return outerHTML;
	}

	if (node.nodeType === 3) {
		return escapeHtml(node.textContent ?? '');
	}

	if (Array.isArray(node.childNodes)) {
		return node.childNodes.map((child) => renderNodeLike(child)).join('');
	}

	return escapeHtml(node.textContent ?? '');
}

function isIterable(value: unknown): value is Iterable<unknown> {
	return typeof value !== 'string' && typeof value === 'object' && value !== null && Symbol.iterator in value;
}

function isNodeLike(value: unknown): value is JsxNodeLike {
	return typeof value === 'object' && value !== null && 'nodeType' in value;
}
