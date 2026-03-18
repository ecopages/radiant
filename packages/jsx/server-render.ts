import type { JsxChild, JsxElement, JsxNodeLike, TemplateResultLike } from './jsx-runtime';
import {
	ATTRIBUTE_BINDING_PATTERN,
	ATTRIBUTE_BINDING_PREFIX,
	getBindingKind,
	serializeBindingDescriptor,
} from './hydration-bindings';

export type RenderToStringOptions = {
	hydrate?: boolean;
};

type RenderContext = {
	hydrate: boolean;
	nextBindingIndex: number;
};

/**
 * Serializes a Radiant JSX value into an HTML string.
 */
export function renderToString(value: JsxElement, options: RenderToStringOptions = {}): string {
	return renderChild(value, {
		hydrate: options.hydrate === true,
		nextBindingIndex: 0,
	});
}

function renderChild(value: JsxChild, context: RenderContext): string {
	if (value === undefined || value === null || value === false) {
		return '';
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
			html += renderChild(child as JsxChild, context);
		}

		return html;
	}

	return escapeHtml(String(value));
}

function renderTemplateResult(template: TemplateResultLike, context: RenderContext): string {
	let html = '';

	for (let index = 0; index < template.values.length; index += 1) {
		const currentString = template.strings[index] ?? '';
		const value = template.values[index];
		const attributeBinding = currentString.match(ATTRIBUTE_BINDING_PATTERN);

		if (!attributeBinding) {
			html += currentString;
			html += renderChild(value as JsxChild, context);
			continue;
		}

		const [, leading, whitespace, bindingPrefix, bindingName] = attributeBinding;
		const bindingKind = getBindingKind(bindingPrefix);
		const bindingIndex = context.nextBindingIndex;
		html += leading;

		if (context.hydrate) {
			html += `${whitespace}${ATTRIBUTE_BINDING_PREFIX}${bindingIndex}="${serializeBindingDescriptor(bindingKind, bindingName)}"`;
		}

		context.nextBindingIndex += 1;

		if (bindingPrefix === '@' || bindingPrefix === '.') {
			continue;
		}

		if (bindingPrefix === '?') {
			if (value) {
				html += `${whitespace}${bindingName}`;
			}
			continue;
		}

		if (value === undefined || value === null || value === false) {
			continue;
		}

		html += `${whitespace}${bindingName}="${escapeAttribute(String(value))}"`;
	}

	html += template.strings[template.strings.length - 1] ?? '';
	return html;
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

function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
	return escapeHtml(value).replace(/"/g, '&quot;');
}

function isTemplateResultLike(value: unknown): value is TemplateResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Partial<TemplateResultLike>)['_$litType$'] === 1 &&
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
