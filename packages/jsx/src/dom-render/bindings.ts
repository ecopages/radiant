import { attachEventBindingListener, detachEventBindingListener, isEventListenerObject } from './event-delegation.ts';
import { getElementAttributeValue, removeElementAttribute, setElementAttributeValue } from './namespaces.ts';
import { resolveReactiveSnapshot } from './runtime-helpers.ts';
import type { BindingDescriptor, DeferredPropertyBinding, LiveAttributePart } from './types.ts';

type ApplyBindingOptions = {
	rootTarget: HTMLElement;
	deferredProperties: DeferredPropertyBinding[];
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
	const resolvedValue = resolveReactiveSnapshot(value);
	const livePart = options.livePart;

	switch (binding.kind) {
		case 'attr':
			if (resolvedValue === undefined || resolvedValue === null) {
				removeElementAttribute(element, binding.name);
				if (livePart) livePart.previousValue = resolvedValue;
				return;
			}

			{
				const nextValue = String(resolvedValue);

				if (
					!livePart ||
					livePart.previousValue !== resolvedValue ||
					getElementAttributeValue(element, binding.name) !== nextValue
				) {
					setElementAttributeValue(element, binding.name, nextValue);
				}

				if (livePart) livePart.previousValue = resolvedValue;
			}
			return;

		case 'bool':
			if (resolvedValue) {
				element.setAttribute(binding.name, '');
			} else {
				element.removeAttribute(binding.name);
			}

			if (livePart) livePart.previousValue = resolvedValue;
			return;

		case 'event': {
			const nextListener = asEventBindingListener(resolvedValue);
			const previousListener = livePart ? asEventBindingListener(livePart.previousValue) : null;

			if (livePart?.previousValue === resolvedValue) {
				return;
			}

			if (previousListener) {
				detachEventBindingListener(options.rootTarget, element, binding.name, previousListener);
			}

			if (nextListener) {
				attachEventBindingListener(options.rootTarget, element, binding.name, nextListener);
			}

			if (livePart) livePart.previousValue = resolvedValue;
			return;
		}

		case 'native-event': {
			const nextListener = asEventBindingListener(resolvedValue);
			const previousListener = livePart ? asEventBindingListener(livePart.previousValue) : null;

			if (livePart?.previousValue === resolvedValue) {
				return;
			}

			if (previousListener) {
				element.removeEventListener(binding.name, previousListener);
			}

			if (nextListener) {
				element.addEventListener(binding.name, nextListener);
			}

			if (livePart) livePart.previousValue = resolvedValue;
			return;
		}

		case 'prop':
			options.deferredProperties.push({
				element,
				name: binding.name,
				value: resolvedValue,
			});

			if (livePart) livePart.previousValue = resolvedValue;
			return;
	}
}

/** Applies a hydration binding marker to an existing SSR element. */
export function applyAttributeBinding(
	element: Element,
	binding: Exclude<BindingDescriptor, { kind: 'child' }>,
	value: unknown,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
): void {
	applyBindingToElement(element, binding, value, { rootTarget, deferredProperties });
}

/** Applies a binding to a live template attribute part. */
export function applyResolvedAttributeBinding(
	part: LiveAttributePart,
	value: unknown,
	deferredProperties: DeferredPropertyBinding[],
): void {
	applyBindingToElement(part.element, part.binding, value, {
		rootTarget: part.rootTarget,
		deferredProperties,
		livePart: part,
	});
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
