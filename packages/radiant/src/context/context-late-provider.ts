import type { ContextHostLike } from './context-host';
import { resolveContextHostElement } from './context-host';
import { ContextEventsTypes, type ContextProviderEvent } from './events';
import type { UnknownContext } from './types';

type PendingContextRequest = {
	element: Element;
	context: UnknownContext;
	/** Dispatches the request again; returns whether a provider handled it. */
	retry: () => boolean;
};

/**
 * Requests no provider has answered yet, per consumer element and request key.
 *
 * @remarks
 * Part of the community context protocol's late-provider pattern. A provider whose element is defined after its
 * consumers announces itself with a `context-provider` event; the consumers below it that are still waiting then
 * dispatch their request again. The key is the consumer's stable callback, so a request made twice (the connect
 * pass and its microtask retry) is kept once.
 */
const pendingByElement = new WeakMap<Element, Map<object, PendingContextRequest>>();
const pendingElements = new Set<Element>();
const hostsWithCleanup = new WeakSet<object>();
let listening = false;

function isWithin(provider: Element, node: Node | null): boolean {
	let current: Node | null = node;

	while (current) {
		if (current === provider) return true;
		current = current.parentNode ?? (current as ShadowRoot).host ?? null;
	}

	return false;
}

function onContextProvider(event: Event): void {
	const { context } = (event as ContextProviderEvent).detail;
	const provider = event.target;

	if (!(provider instanceof Element)) return;

	for (const element of Array.from(pendingElements)) {
		const pending = pendingByElement.get(element);
		if (!pending || !element.isConnected || !isWithin(provider, element)) continue;

		for (const [key, request] of Array.from(pending)) {
			if (request.context === context && request.retry()) {
				pending.delete(key);
			}
		}

		if (pending.size === 0) {
			pendingByElement.delete(element);
			pendingElements.delete(element);
		}
	}
}

function forgetPendingRequests(element: Element): void {
	pendingByElement.delete(element);
	pendingElements.delete(element);
}

/**
 * Remembers an unanswered context request so a provider defined later can answer it.
 *
 * @remarks
 * The request is dropped when the host disconnects, so a consumer that left is never called. Browser only: a host
 * without a DOM element, as on the server, is ignored.
 */
export function registerPendingContextRequest(
	host: ContextHostLike,
	context: UnknownContext,
	key: object,
	retry: () => boolean,
): void {
	const element = resolveContextHostElement(host);

	if (!element || typeof document === 'undefined' || typeof element.isConnected !== 'boolean') {
		return;
	}

	if (!listening) {
		listening = true;
		document.addEventListener(ContextEventsTypes.PROVIDER, onContextProvider);
	}

	if (!hostsWithCleanup.has(host)) {
		hostsWithCleanup.add(host);
		host.registerCleanupCallback(() => forgetPendingRequests(element));
	}

	let pending = pendingByElement.get(element);
	if (!pending) {
		pending = new Map();
		pendingByElement.set(element, pending);
	}

	pending.set(key, { element, context, retry });
	pendingElements.add(element);
}
