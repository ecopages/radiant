import { escapeAttribute } from './html-escape.ts';
import { getActiveSsrRenderContext } from './ssr-render-scope.ts';
import type { JsxNodeLike, JsxPropsWithChildren, JsxRenderable, ServerRenderableCustomElement } from './types.ts';

type ServerRenderedCustomElementRuntime = {
	forEachNormalizedAttribute: (
		attributes: Record<string, unknown>,
		append: (name: string, value: unknown) => void,
	) => void;
	renderValueToString: (value: JsxRenderable | undefined) => string;
	resolveBindingShapeValue: (value: unknown) => unknown;
	shouldUseAttributeBindingByDefaultForElement: (elementName: string, name: string) => boolean;
	shouldUseBooleanAttributeBinding: (name: string) => boolean;
};

export function createServerRenderedCustomElement<Props extends object>(
	type: string,
	props: Props,
	runtime: ServerRenderedCustomElementRuntime,
): JsxNodeLike | undefined {
	if (!shouldServerRenderCustomElement(type)) {
		return undefined;
	}

	const registry = (
		globalThis as typeof globalThis & {
			customElements?: {
				get(name: string): CustomElementConstructor | undefined;
			};
		}
	).customElements;
	const constructor = registry?.get(type);

	if (!constructor) {
		return undefined;
	}

	const { children, key: _key, ...rawAttributes } = props as JsxPropsWithChildren & Record<string, unknown>;

	return {
		nodeType: 1,
		get outerHTML() {
			const resolvedRender = resolveServerRenderedCustomElementRender(
				constructor,
				type,
				rawAttributes,
				children,
				runtime,
			);

			return resolvedRender
				? runtime.renderValueToString(resolvedRender)
				: renderFallbackCustomElementMarkup(type, rawAttributes, children, runtime);
		},
	};
}

function renderFallbackCustomElementMarkup(
	tagName: string,
	attributes: Record<string, unknown>,
	children: JsxRenderable | undefined,
	runtime: ServerRenderedCustomElementRuntime,
): string {
	let html = `<${tagName}`;

	runtime.forEachNormalizedAttribute(attributes, (name, value) => {
		const normalizedName = name.startsWith('attr:') ? name.slice(5) : name;
		const bindingShapeValue = runtime.resolveBindingShapeValue(value);

		if (
			value === undefined ||
			name.startsWith('on:') ||
			name.startsWith('on-native:') ||
			name.startsWith('prop:')
		) {
			return;
		}

		if (
			!name.startsWith('attr:') &&
			!runtime.shouldUseAttributeBindingByDefaultForElement('custom-element', normalizedName)
		) {
			return;
		}

		if (typeof bindingShapeValue === 'boolean' && runtime.shouldUseBooleanAttributeBinding(normalizedName)) {
			if (bindingShapeValue) {
				html += ` ${normalizedName}`;
			}
			return;
		}

		html += ` ${normalizedName}="${escapeAttribute(String(value))}"`;
	});

	html += `>${runtime.renderValueToString(children)}</${tagName}>`;
	return html;
}

function resolveServerRenderedCustomElementRender(
	constructor: CustomElementConstructor,
	tagName: string,
	attributes: Record<string, unknown>,
	children: JsxRenderable | undefined,
	runtime: ServerRenderedCustomElementRuntime,
): JsxRenderable | undefined {
	const instance = new constructor();
	const ssr = getActiveSsrRenderContext();

	applyServerCustomElementAttributes(instance, attributes, runtime);
	applyServerCustomElementChildren(instance, children, runtime);

	const hookRender = ssr?.customElementRenderHook?.({
		constructor,
		hydrate: ssr?.hydrate === true,
		instance,
		props: attributes,
		tagName,
	});

	if (hookRender) {
		return hookRender;
	}

	if (!isServerRenderableCustomElement(instance)) {
		return undefined;
	}

	const hydrateActive = ssr?.hydrate === true;
	return {
		nodeType: 1,
		outerHTML: instance.renderHostToString({ hydrate: hydrateActive, mode: hydrateActive ? 'hydrate' : 'plain' }),
	};
}

function shouldServerRenderCustomElement(type: string): boolean {
	return type.includes('-');
}

function isServerRenderableCustomElement(value: unknown): value is ServerRenderableCustomElement {
	return typeof value === 'object' && value !== null && 'renderHostToString' in value;
}

function applyServerCustomElementAttributes(
	element: HTMLElement,
	attributes: Record<string, unknown>,
	runtime: ServerRenderedCustomElementRuntime,
): void {
	const assignableElement = element as HTMLElement & Record<string, unknown>;

	runtime.forEachNormalizedAttribute(attributes, (name, value) => {
		const normalizedName = name.startsWith('attr:') ? name.slice(5) : name;
		const bindingShapeValue = runtime.resolveBindingShapeValue(value);

		if (value === undefined || name.startsWith('on:') || name.startsWith('on-native:')) {
			return;
		}

		if (name.startsWith('prop:')) {
			assignableElement[name.slice(5)] = value;
			return;
		}

		if (
			!name.startsWith('attr:') &&
			!runtime.shouldUseAttributeBindingByDefaultForElement('custom-element', normalizedName)
		) {
			assignableElement[normalizedName] = value;
			return;
		}

		if (typeof bindingShapeValue === 'boolean' && runtime.shouldUseBooleanAttributeBinding(normalizedName)) {
			syncServerCustomElementProperty(assignableElement, normalizedName, bindingShapeValue);

			if (bindingShapeValue) {
				element.setAttribute?.(normalizedName, '');
			} else {
				element.removeAttribute?.(normalizedName);
			}
			return;
		}

		syncServerCustomElementProperty(assignableElement, normalizedName, value);
		element.setAttribute?.(normalizedName, String(value));
	});
}

function applyServerCustomElementChildren(
	element: HTMLElement,
	children: JsxRenderable | undefined,
	runtime: ServerRenderedCustomElementRuntime,
): void {
	if (children === undefined || !('children' in element || 'innerHTML' in element)) {
		return;
	}

	const serializedChildren = runtime.renderValueToString(children);

	if (canAssignServerCustomElementProperty(element, 'children')) {
		Reflect.set(element, 'children', serializedChildren);
	}

	if (canAssignServerCustomElementProperty(element, 'innerHTML')) {
		Reflect.set(element, 'innerHTML', serializedChildren);
	}
}

function canAssignServerCustomElementProperty(element: HTMLElement, propertyName: string): boolean {
	let current: object | null = element as object;

	while (current) {
		const descriptor = Object.getOwnPropertyDescriptor(current, propertyName);

		if (descriptor) {
			return descriptor.writable === true || typeof descriptor.set === 'function';
		}

		current = Object.getPrototypeOf(current);
	}

	return false;
}

function syncServerCustomElementProperty(
	element: HTMLElement & Record<string, unknown>,
	propertyName: string,
	value: unknown,
): void {
	if (!canAssignServerCustomElementProperty(element, propertyName)) {
		return;
	}

	Reflect.set(element, propertyName, value);
}
