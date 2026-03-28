import {
	isKeyedJsxValue,
	isSubscribableJsxValue,
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

/** Internal global slot used to propagate the active SSR hydrate mode into custom-element SSR helpers. */
const ACTIVE_SSR_HYDRATE_SYMBOL = Symbol.for('@ecopages/jsx.active-ssr-hydrate');

/** Options that control how JSX values are serialized during SSR. */
export type RenderToStringOptions = {
	/**
	 * When `true`, emits hydration binding markers alongside the serialized HTML
	 * so the DOM hydrator can reconnect listeners and property bindings without
	 * replacing the SSR DOM tree.
	 */
	hydrate?: boolean;
};

type RenderContext = {
	hydrate: boolean;
	nextBindingIndex: number;
};

/**
 * Serializes a Radiant JSX value into an HTML string.
 *
 * The renderer resolves keyed and subscribable wrappers transparently, reuses
 * cached interpolation metadata for template results, and optionally embeds
 * hydration descriptors when `options.hydrate` is enabled.
 *
 * @param value JSX value to serialize.
 * @param options Controls whether hydration metadata is emitted.
 * @returns HTML string representation of the provided JSX value.
 */
export function renderToString(value: JsxRenderable, options: RenderToStringOptions = {}): string {
	const hydrate = options.hydrate === true;
	const globalScope = globalThis as typeof globalThis & Record<PropertyKey, unknown>;
	const previousHydrateValue = globalScope[ACTIVE_SSR_HYDRATE_SYMBOL];
	globalScope[ACTIVE_SSR_HYDRATE_SYMBOL] = hydrate;

	try {
		return renderChild(value, {
			hydrate,
			nextBindingIndex: 0,
		});
	} finally {
		if (typeof previousHydrateValue === 'undefined') {
			delete globalScope[ACTIVE_SSR_HYDRATE_SYMBOL];
		} else {
			globalScope[ACTIVE_SSR_HYDRATE_SYMBOL] = previousHydrateValue;
		}
	}
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

	if (isTemplateResultLike(value)) {
		return renderTemplateResult(value, context);
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
	const interpolationParts = getTemplateInterpolationParts(template.strings);
	let html = '';

	for (let index = 0; index < template.values.length; index += 1) {
		const interpolationPart = interpolationParts[index];
		const value = resolveReactiveSnapshot(template.values[index]);

		if (!interpolationPart || interpolationPart.type === 'child') {
			html += interpolationPart && interpolationPart.type === 'child' ? interpolationPart.string : (template.strings[index] ?? '');
			html += renderChild(value as JsxRenderable, context);
			continue;
		}

		const bindingKind = interpolationPart.kind;
		const bindingIndex = context.nextBindingIndex;
		html += interpolationPart.leading;

		if (context.hydrate) {
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
	if (typeof node.outerHTML === 'string') {
		return node.outerHTML;
	}

	if (node.nodeType === 3) {
		return escapeHtml(node.textContent ?? '');
	}

	if (Array.isArray(node.childNodes)) {
		return node.childNodes.map((child) => renderNodeLike(child)).join('');
	}

	return escapeHtml(node.textContent ?? '');
}

function isTemplateResultLike(value: unknown): value is TemplateResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Partial<TemplateResultLike>)['_$rType$'] === 1 &&
		Array.isArray((value as Partial<TemplateResultLike>).strings) &&
		Array.isArray((value as Partial<TemplateResultLike>).values)
	);
}

function isIterable(value: unknown): value is Iterable<unknown> {
	return typeof value !== 'string' && typeof value === 'object' && value !== null && Symbol.iterator in value;
}

function isNodeLike(value: unknown): value is JsxNodeLike {
	return typeof value === 'object' && value !== null && 'nodeType' in value;
}
