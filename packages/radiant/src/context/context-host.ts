import type { REACTIVE_HOST, ReactiveHostInternals } from '../core/reactive-host';
import type { UnknownContext } from './types';
import { resolveHostElementOrNull } from '../helpers/resolve-host-element';

type ContextHostApi = {
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions,
	): void;
	removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | EventListenerOptions,
	): void;
	dispatchEvent(event: Event): boolean;
	registerConnectedCallback(callback: () => void): void;
	registerCleanupCallback(callback: () => void): void;
	connectedContextCallback(context: UnknownContext): void;
	readonly [REACTIVE_HOST]: ReactiveHostInternals;
};

type SsrHydrationContainer = {
	children?: ArrayLike<Element> | undefined;
	childNodes?: ArrayLike<{ nodeType: number }> | undefined;
};

export type ContextHydrationHost = Element | SsrHydrationContainer;

export type ContextHostLike =
	| (ContextHostApi & Element)
	| (ContextHostApi & { host: Element })
	| (ContextHostApi & { element: Element })
	| (ContextHostApi & SsrHydrationContainer);

export function resolveContextHostElement(host: ContextHostLike): Element | null {
	return resolveHostElementOrNull(host);
}

export function resolveContextHydrationHost(host: ContextHostLike): ContextHydrationHost {
	const element = resolveHostElementOrNull(host);
	if (element) {
		return element;
	}

	return host as ContextHydrationHost;
}
