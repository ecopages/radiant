import { resolveAttributeText } from '../factory/attribute-normalize.ts';
import { attachEventBindingListener, detachEventBindingListener, isEventListenerObject } from './event-delegation.ts';
import { getElementAttributeValue, removeElementAttribute, setElementAttributeValue } from './namespaces.ts';
import { resolveReactiveSnapshot } from './runtime-helpers.ts';
import { CUSTOM_ELEMENT_CHILDREN_SYMBOL } from '../types/index.ts';
import type { BindingDescriptor, DeferredPropertyBinding, LiveAttributePart } from './types.ts';

type ApplyBindingOptions = {
	rootTarget: HTMLElement;
	deferredProperties: DeferredPropertyBinding[];
	/**
	 * Live template part backing this binding, when one exists.
	 *
	 * Present for mounted template parts, which cache `previousValue` to skip redundant
	 * DOM writes. Absent for one-shot hydration marker application, where no live part
	 * has been created yet.
	 */
	livePart?: LiveAttributePart;
};

/**
 * Applies one attribute-style binding to a DOM element.
 *
 * @param element Target element.
 * @param binding Compiled binding descriptor excluding child slots.
 * @param value Binding value, which may still be wrapped in a reactive source.
 * @param options Root target for delegated events, deferred property queue, and live-part cache.
 */
export function applyBindingToElement(
	element: Element,
	binding: Exclude<BindingDescriptor, { kind: 'child' }>,
	value: unknown,
	options: ApplyBindingOptions,
): void {
	const livePart = options.livePart;

	if (binding.kind === 'children') {
		applyDeferredPropertyBinding(
			element,
			CUSTOM_ELEMENT_CHILDREN_SYMBOL,
			value,
			options.deferredProperties,
			livePart,
		);
		return;
	}

	const resolvedValue = resolveReactiveSnapshot(value);

	switch (binding.kind) {
		case 'attr':
			applyAttributeBinding(element, binding.name, resolvedValue, livePart);
			return;

		case 'bool':
			applyBooleanBinding(element, binding.name, resolvedValue, livePart);
			return;

		case 'event': {
			applyDelegatedEventBinding(element, binding.name, resolvedValue, options.rootTarget, livePart);
			return;
		}

		case 'native-event': {
			applyNativeEventBinding(element, binding.name, resolvedValue, livePart);
			return;
		}

		case 'prop':
			applyDeferredPropertyBinding(element, binding.name, resolvedValue, options.deferredProperties, livePart);
			return;
	}
}

function applyAttributeBinding(
	element: Element,
	name: string,
	value: unknown,
	livePart: LiveAttributePart | undefined,
): void {
	const nextValue = resolveAttributeText(name, value);
	if (nextValue === undefined) {
		removeElementAttribute(element, name);
		updatePreviousValue(livePart, value);
		return;
	}

	const cachedValue = name.toLowerCase() === 'style' ? nextValue : value;
	if (!livePart || livePart.previousValue !== cachedValue || getElementAttributeValue(element, name) !== nextValue) {
		setElementAttributeValue(element, name, nextValue);
	}
	updatePreviousValue(livePart, cachedValue);
}

function applyBooleanBinding(
	element: Element,
	name: string,
	value: unknown,
	livePart: LiveAttributePart | undefined,
): void {
	const text = resolveAttributeText(name, value, true);
	if (text === undefined) element.removeAttribute(name);
	else element.setAttribute(name, text);
	updatePreviousValue(livePart, value);
}

function applyDelegatedEventBinding(
	element: Element,
	name: string,
	value: unknown,
	rootTarget: HTMLElement,
	livePart: LiveAttributePart | undefined,
): void {
	if (livePart?.previousValue === value) return;
	const previousListener = livePart ? asEventBindingListener(livePart.previousValue) : null;
	if (previousListener) detachEventBindingListener(rootTarget, element, name, previousListener);
	const nextListener = asEventBindingListener(value);
	if (nextListener) attachEventBindingListener(rootTarget, element, name, nextListener);
	updatePreviousValue(livePart, value);
}

/**
 * @remarks A live part registers a wrapper of its own around the handler, not the handler itself. The browser keeps
 * one registration per event and listener, so two parts bound to one function would share it, and dropping one would
 * remove the other's.
 */
function applyNativeEventBinding(
	element: Element,
	name: string,
	value: unknown,
	livePart: LiveAttributePart | undefined,
): void {
	if (livePart?.previousValue === value) return;
	const handler = asEventBindingListener(value);

	if (!livePart) {
		if (handler) element.addEventListener(name, handler);
		return;
	}

	if (livePart.nativeListener) element.removeEventListener(name, livePart.nativeListener);
	livePart.nativeListener = handler
		? (event) => (typeof handler === 'function' ? handler.call(element, event) : handler.handleEvent(event))
		: undefined;
	if (livePart.nativeListener) element.addEventListener(name, livePart.nativeListener);
	updatePreviousValue(livePart, value);
}

function applyDeferredPropertyBinding(
	element: Element,
	name: PropertyKey,
	value: unknown,
	deferredProperties: DeferredPropertyBinding[],
	livePart: LiveAttributePart | undefined,
): void {
	deferredProperties.push({ element, name, value });
	updatePreviousValue(livePart, value);
}

function updatePreviousValue(livePart: LiveAttributePart | undefined, value: unknown): void {
	if (livePart) livePart.previousValue = value;
}

function asEventBindingListener(value: unknown): EventListenerOrEventListenerObject | null {
	if (typeof value === 'function') {
		return value as EventListener;
	}

	if (isEventListenerObject(value)) {
		return value;
	}

	return null;
}
