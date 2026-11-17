import { resolveAttributeText } from '../factory/attribute-normalize.ts';
import { resolveValueBindingKind } from '../factory/binding-defaults.ts';
import { attachEventBindingListener, detachEventBindingListener, isEventListenerObject } from './event-delegation.ts';
import { getElementAttributeValue, removeElementAttribute, setElementAttributeValue } from './namespaces.ts';
import { detachRef, reportRefError, runRefCleanup } from './mounted-disposal.ts';
import { resolveReactiveSnapshot } from './runtime-helpers.ts';
import { CUSTOM_ELEMENT_CHILDREN_SYMBOL, type JsxRefCallback } from '../types/index.ts';
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

	if (binding.kind === 'bool-or-prop' && typeof resolvedValue !== 'boolean') {
		applyPropertyFallback(element, binding.name, resolvedValue, options.deferredProperties, livePart);
		return;
	}

	switch (resolveValueBindingKind(binding.kind, resolvedValue)) {
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

		case 'ref':
			applyRefBinding(element, resolvedValue, options.deferredProperties, livePart);
			return;

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

/** @remarks Read the live attribute so a render restores the authored value or absence after external changes. */
function applyBooleanBinding(
	element: Element,
	name: string,
	value: unknown,
	livePart: LiveAttributePart | undefined,
): void {
	const text = resolveAttributeText(name, value, true);
	if (getElementAttributeValue(element, name) !== (text ?? null)) {
		if (text === undefined) removeElementAttribute(element, name);
		else setElementAttributeValue(element, name, text);
	}
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

/**
 * Binds a non-boolean value of a `bool-or-prop` part as a property, as a static value of that type would.
 *
 * @remarks A static value binds on a fresh element, and a live part cannot give one back, so this comes as close as
 * the element allows: a property value replacing a boolean removes the attribute the boolean set, and `undefined`,
 * which a static value omits, writes the property only to clear a property value this part wrote. A boolean that
 * replaces a property value sets the attribute and leaves the property as it is.
 */
function applyPropertyFallback(
	element: Element,
	name: string,
	value: unknown,
	deferredProperties: DeferredPropertyBinding[],
	livePart: LiveAttributePart | undefined,
): void {
	const previous = livePart?.previousValue;

	if (typeof previous === 'boolean') {
		removeElementAttribute(element, name);
	}

	if (value === undefined && (previous === undefined || typeof previous === 'boolean')) {
		updatePreviousValue(livePart, value);
		return;
	}

	applyDeferredPropertyBinding(element, name, value, deferredProperties, livePart);
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

/**
 * @remarks The callback attaches from the deferred queue, after every property write of the pass and before its
 * ancestors' callbacks, so it sees its node in the page. The queued
 * attach checks that the part was not detached since it was queued, so a part replaced or disposed before the queue runs
 * does not attach a stale one. A value that is not a function detaches the current ref and binds nothing.
 *
 * A callback that throws is reported through {@link reportRefError} and does not stop the flush. It still counts as
 * attached: the same callback is not called again on a later render, and detaching calls it with `null`, as for a
 * callback that returned nothing. Only a different callback, or dropping the ref, ends it.
 *
 * A callback that detaches its own part while it runs is not called with `null` mid-attach: its cleanup is recorded
 * once it returns, and runs at once when the part was detached meanwhile, even if the same callback was bound again
 * and attached in the meantime, whose own cleanup is the one kept. With no cleanup returned, the `null` call for that
 * detach is skipped when the part is bound to the same callback again, which would otherwise end up holding `null`.
 */
function applyRefBinding(
	element: Element,
	value: unknown,
	deferredProperties: DeferredPropertyBinding[],
	livePart: LiveAttributePart | undefined,
): void {
	if (!livePart) return;
	const callback = typeof value === 'function' ? (value as JsxRefCallback) : undefined;
	if (livePart.previousValue === callback) return;

	detachRef(livePart);
	livePart.previousValue = callback;
	if (!callback) return;

	const epoch = livePart.refEpoch;

	deferredProperties.push({
		element,
		run: () => {
			if (livePart.refEpoch !== epoch) return;
			let returned: (() => void) | undefined;
			try {
				const result = callback(element);
				if (typeof result === 'function') returned = result;
			} catch (error) {
				reportRefError(error);
			}
			if (livePart.refEpoch === epoch) livePart.refCleanup = returned ?? (() => callback(null));
			else if (returned) runRefCleanup(returned);
			else if (livePart.previousValue !== callback) runRefCleanup(() => callback(null));
		},
	});
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
