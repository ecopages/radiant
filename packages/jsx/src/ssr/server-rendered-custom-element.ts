import { createJsxElement, createMarkupNodeLike } from '../factory/jsx-factory.ts';
import { serializeRenderable } from './serialize-renderable.ts';
import { getActiveSsrRenderContext } from './ssr-render-scope.ts';
import { RADIANT_MARKUP_NODE_SYMBOL } from '../types/index.ts';
import type {
	JsxNodeLike,
	JsxPropsWithChildren,
	JsxRenderable,
	ServerRenderableCustomElement,
} from '../types/index.ts';

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
		[RADIANT_MARKUP_NODE_SYMBOL]: true,
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
	_runtime: ServerRenderedCustomElementRuntime,
): string {
	return serializeRenderable(
		createJsxElement(
			tagName,
			{ ...attributes, children } as JsxPropsWithChildren & Record<string, unknown>,
			'multiple',
		),
		{ mode: 'plain' },
	);
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
	return createMarkupNodeLike(
		instance.renderHostToString({ hydrate: hydrateActive, mode: hydrateActive ? 'hydrate' : 'plain' }),
	);
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
