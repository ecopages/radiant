import { shouldDelegateEventBinding } from '../event-binding-policy.ts';

type DelegationRootState = {
	handlers: Map<string, DelegatedEventDispatcher>;
};

type DelegatedEventDispatcher = {
	elementHandlers: Map<Element, EventListenerOrEventListenerObject>;
	listener: EventListener;
	type: string;
};

const ROOT_DELEGATION_STATE = new WeakMap<HTMLElement, DelegationRootState>();

/**
 * Type guard that narrows `value` to the `EventListenerObject` interface.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` is an object with a `handleEvent` method.
 */
export function isEventListenerObject(value: unknown): value is EventListenerObject {
	return typeof value === 'object' && value !== null && 'handleEvent' in value;
}

export function attachEventBindingListener(
	rootTarget: HTMLElement,
	element: Element,
	eventName: string,
	listener: EventListenerOrEventListenerObject,
): void {
	if (!shouldDelegateEventBinding(eventName)) {
		element.addEventListener(eventName, listener);
		return;
	}

	const rootState = getDelegationRootState(rootTarget);
	let dispatcher = rootState.handlers.get(eventName);

	if (!dispatcher) {
		const rootListener: EventListener = (event) => {
			dispatchDelegatedEvent(rootTarget, eventName, event);
		};

		dispatcher = {
			elementHandlers: new Map(),
			listener: rootListener,
			type: eventName,
		};

		rootTarget.addEventListener(eventName, rootListener);
		rootState.handlers.set(eventName, dispatcher);
	}

	dispatcher.elementHandlers.set(element, listener);
}

export function detachEventBindingListener(
	rootTarget: HTMLElement,
	element: Element,
	eventName: string,
	listener: EventListenerOrEventListenerObject,
): void {
	if (!shouldDelegateEventBinding(eventName)) {
		element.removeEventListener(eventName, listener);
		return;
	}

	const rootState = ROOT_DELEGATION_STATE.get(rootTarget);

	if (!rootState) {
		return;
	}

	const dispatcher = rootState.handlers.get(eventName);

	if (!dispatcher) {
		return;
	}

	if (dispatcher.elementHandlers.get(element) !== listener) {
		return;
	}

	dispatcher.elementHandlers.delete(element);

	if (dispatcher.elementHandlers.size === 0) {
		rootTarget.removeEventListener(eventName, dispatcher.listener);
		rootState.handlers.delete(eventName);
	}

	if (rootState.handlers.size === 0) {
		ROOT_DELEGATION_STATE.delete(rootTarget);
	}
}

export function clearDelegationRoot(rootTarget: HTMLElement): void {
	const rootState = ROOT_DELEGATION_STATE.get(rootTarget);

	if (!rootState) {
		return;
	}

	for (const dispatcher of rootState.handlers.values()) {
		rootTarget.removeEventListener(dispatcher.type, dispatcher.listener);
	}

	ROOT_DELEGATION_STATE.delete(rootTarget);
}

function getDelegationRootState(rootTarget: HTMLElement): DelegationRootState {
	const existingState = ROOT_DELEGATION_STATE.get(rootTarget);

	if (existingState) {
		return existingState;
	}

	const nextState: DelegationRootState = {
		handlers: new Map(),
	};

	ROOT_DELEGATION_STATE.set(rootTarget, nextState);
	return nextState;
}

function dispatchDelegatedEvent(rootTarget: HTMLElement, eventName: string, event: Event): void {
	const rootState = ROOT_DELEGATION_STATE.get(rootTarget);
	const dispatcher = rootState?.handlers.get(eventName);

	if (!dispatcher) {
		return;
	}

	let currentElement = getEventTargetElement(event.target);

	while (currentElement) {
		if (!rootTarget.contains(currentElement) && currentElement !== rootTarget) {
			return;
		}

		const listener = dispatcher.elementHandlers.get(currentElement);

		if (listener) {
			invokeEventListener(listener, createDelegatedEventProxy(event, currentElement));

			if (event.cancelBubble) {
				return;
			}
		}

		if (currentElement === rootTarget) {
			return;
		}

		currentElement = currentElement.parentElement;
	}
}

function getEventTargetElement(target: EventTarget | null): Element | null {
	if (target instanceof Element) {
		return target;
	}

	if (target instanceof Node) {
		return target.parentElement;
	}

	return null;
}

function createDelegatedEventProxy<EventType extends Event>(event: EventType, currentTarget: EventTarget): EventType {
	return new Proxy(event, {
		get(target, property) {
			if (property === 'currentTarget') {
				return currentTarget;
			}

			const value = Reflect.get(target, property, target);

			if (typeof value === 'function') {
				return value.bind(target);
			}

			return value;
		},
	}) as EventType;
}

function invokeEventListener(listener: EventListenerOrEventListenerObject, event: Event): void {
	if (typeof listener === 'function') {
		listener(event);
		return;
	}

	listener.handleEvent(event);
}
