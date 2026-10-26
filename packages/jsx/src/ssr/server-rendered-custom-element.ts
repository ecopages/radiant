import { createJsxElement, createMarkupNodeLike } from '../factory/jsx-factory.ts';
import { forEachNormalizedAttribute, serializeStyleSnapshot } from '../factory/attribute-normalize.ts';
import {
	shouldUseAttributeBindingByDefaultForElement,
	shouldUseBooleanAttributeBinding,
} from '../factory/binding-defaults.ts';
import { isCustomElementSubtreeRoot } from '../hydration/hydration-subtree-policy.ts';
import { resolveReactiveSnapshot } from '../types/renderable-guards.ts';
import { renderJsxRenderableToString } from './serialize-plain.ts';
import { serializeRenderable } from './serialize-renderable.ts';
import { getActiveSsrRenderContext } from './ssr-render-scope.ts';
import { RADIANT_MARKUP_NODE_SYMBOL } from '../types/index.ts';
import type {
	JsxNodeLike,
	JsxPropsWithChildren,
	JsxRenderable,
	ServerRenderableCustomElement,
} from '../types/index.ts';

export function createServerRenderedCustomElement<Props extends object>(
	type: string,
	props: Props,
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
			const resolvedRender = resolveServerRenderedCustomElementRender(constructor, type, rawAttributes, children);

			return resolvedRender
				? renderJsxRenderableToString(resolvedRender)
				: renderFallbackCustomElementMarkup(type, rawAttributes, children);
		},
	};
}

function renderFallbackCustomElementMarkup(
	tagName: string,
	attributes: Record<string, unknown>,
	children: JsxRenderable | undefined,
): string {
	return serializeRenderable(
		createJsxElement(
			tagName,
			{ ...attributes, children } as JsxPropsWithChildren & Record<string, unknown>,
			'multiple',
			true,
		),
		{ mode: 'plain' },
	);
}

function resolveServerRenderedCustomElementRender(
	constructor: CustomElementConstructor,
	tagName: string,
	attributes: Record<string, unknown>,
	children: JsxRenderable | undefined,
): JsxRenderable | undefined {
	const instance = new constructor();
	const ssr = getActiveSsrRenderContext();
	let childrenApplied = false;
	const applyChildren = () => {
		if (childrenApplied) return;
		childrenApplied = true;
		applyServerCustomElementChildren(instance, children);
	};

	applyServerCustomElementAttributes(instance, attributes);

	if (!ssr?.customElementRenderHookOwnsChildren) {
		applyChildren();
	}

	const hookRender = ssr?.customElementRenderHook?.({
		applyChildren,
		children,
		constructor,
		hydrate: ssr?.hydrate === true,
		instance,
		props: attributes,
		tagName,
	});

	if (hookRender) {
		return hookRender;
	}

	applyChildren();

	if (!isServerRenderableCustomElement(instance)) {
		return undefined;
	}

	const hydrateActive = ssr?.hydrate === true;
	return createMarkupNodeLike(
		instance.renderHostToString({ hydrate: hydrateActive, mode: hydrateActive ? 'hydrate' : 'plain' }),
	);
}

function shouldServerRenderCustomElement(type: string): boolean {
	return isCustomElementSubtreeRoot(type);
}

function isServerRenderableCustomElement(value: unknown): value is ServerRenderableCustomElement {
	return typeof value === 'object' && value !== null && 'renderHostToString' in value;
}

function applyServerCustomElementAttributes(element: HTMLElement, attributes: Record<string, unknown>): void {
	const assignableElement = element as HTMLElement & Record<string, unknown>;

	forEachNormalizedAttribute(attributes, (name, value) =>
		applyServerCustomElementAttribute(assignableElement, name, value),
	);
}

function applyServerCustomElementAttribute(
	element: HTMLElement & Record<string, unknown>,
	name: string,
	value: unknown,
): void {
	const normalizedName = name.startsWith('attr:') ? name.slice(5) : name;
	const resolvedValue = resolveReactiveSnapshot(value);

	if (isServerCustomElementEventBinding(name)) {
		return;
	}

	if (name.startsWith('prop:')) {
		element[name.slice(5)] = resolvedValue;
		return;
	}

	if (!shouldUseServerCustomElementAttributeBinding(name, normalizedName)) {
		element[normalizedName] = resolvedValue;
		return;
	}

	if (resolvedValue === undefined || resolvedValue === null) {
		element.removeAttribute?.(normalizedName);
		return;
	}

	if (typeof resolvedValue === 'boolean' && shouldUseBooleanAttributeBinding(normalizedName)) {
		syncServerCustomElementProperty(element, normalizedName, resolvedValue);
		applyServerBooleanAttribute(element, normalizedName, resolvedValue);
		return;
	}

	syncServerCustomElementProperty(element, normalizedName, resolvedValue);
	element.setAttribute?.(normalizedName, serializeServerCustomElementAttribute(normalizedName, resolvedValue));
}

function isServerCustomElementEventBinding(name: string): boolean {
	return name.startsWith('on:') || name.startsWith('on-native:');
}

function shouldUseServerCustomElementAttributeBinding(name: string, normalizedName: string): boolean {
	return name.startsWith('attr:') || shouldUseAttributeBindingByDefaultForElement('custom-element', normalizedName);
}

function applyServerBooleanAttribute(element: HTMLElement, name: string, value: boolean): void {
	if (value) {
		element.setAttribute?.(name, '');
	} else {
		element.removeAttribute?.(name);
	}
}

function serializeServerCustomElementAttribute(name: string, value: unknown): string {
	return name.toLowerCase() === 'style' ? serializeStyleSnapshot(value) : String(value);
}

function applyServerCustomElementChildren(element: HTMLElement, children: JsxRenderable | undefined): void {
	if (children === undefined || !('children' in element || 'innerHTML' in element)) {
		return;
	}

	const serializedChildren =
		getActiveSsrRenderContext()?.renderChild?.(children) ?? renderJsxRenderableToString(children);

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
