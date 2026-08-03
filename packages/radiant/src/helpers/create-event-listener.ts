import type { RadiantElementEventListener } from '../core/radiant-element';
import { isServer } from '@ecopages/radiant/is-server';
import { escapeCssIdentifier } from '../tools/escape-css-identifier';
import { isControllerHost, resolveHostElement } from './resolve-host-element';

/**
 * Selects which DOM tree delegated event listeners should observe.
 */
export type OnEventScope = 'light' | 'shadow' | 'both';

type BaseOnEventConfig = Pick<RadiantElementEventListener, 'type' | 'options'> & {
	scope?: OnEventScope;
};

export type OnEventConfig = BaseOnEventConfig &
	(
		| {
				selector: string;
		  }
		| {
				ref: string;
		  }
		| {
				window: true;
		  }
		| {
				document: true;
		  }
		| {
				mediaQuery: string;
		  }
	);

type DelegatedEventRoot = Element | ShadowRoot;

type EventListenerLifecycleHost = {
	registerConnectedCallback(callback: () => void): void;
	registerCleanupCallback(callback: () => void): void;
	isConnected: boolean;
};

export type EventListenerHost =
	| (EventListenerLifecycleHost & Element)
	| (EventListenerLifecycleHost & { host: Element })
	| (EventListenerLifecycleHost & { element: Element });

const shadowRootListenerHooksKey = Symbol('radiant.shadowRootListenerHooks');
const patchedAttachShadowKey = Symbol('radiant.patchedAttachShadow');

type ShadowRootHookHost = Element & {
	[patchedAttachShadowKey]?: true;
	[shadowRootListenerHooksKey]?: Set<() => void>;
};

function resolveEventListenerHostElement(host: EventListenerHost): Element {
	return resolveHostElement(host);
}

function isControllerEventHost(host: EventListenerHost): host is EventListenerLifecycleHost & { host: Element } {
	return isControllerHost(host);
}

function addDelegatedListener(
	root: DelegatedEventRoot,
	config: Pick<OnEventConfig, 'type' | 'options'>,
	selector: string,
	listener: EventListener,
): () => void {
	const delegatedListener = (event: Event) => {
		const eventTarget = event.target;
		if (!(eventTarget instanceof Node)) return;

		// Text nodes are valid event targets; resolve to the owning element.
		const elementTarget = eventTarget instanceof Element ? eventTarget : eventTarget.parentElement;
		if (!elementTarget) return;

		// Use closest() so clicks on descendants of the matched node still fire —
		// matches() alone breaks buttons that wrap icons, tracks, labels, etc.
		const matched = elementTarget.closest(selector);
		if (matched && (matched === root || root.contains(matched))) {
			listener(event);
		}
	};

	root.addEventListener(config.type, delegatedListener, config.options);

	return () => {
		root.removeEventListener(config.type, delegatedListener, config.options);
	};
}

function registerShadowRootHook(host: EventListenerHost, hook: () => void): void {
	const shadowAwareHost = resolveEventListenerHostElement(host) as ShadowRootHookHost;

	if (!shadowAwareHost[shadowRootListenerHooksKey]) {
		shadowAwareHost[shadowRootListenerHooksKey] = new Set();
	}

	shadowAwareHost[shadowRootListenerHooksKey].add(hook);

	if (shadowAwareHost[patchedAttachShadowKey]) {
		return;
	}

	const originalAttachShadow = shadowAwareHost.attachShadow;

	shadowAwareHost.attachShadow = function patchedAttachShadow(init: ShadowRootInit): ShadowRoot {
		const shadowRoot = originalAttachShadow.call(this, init);
		for (const shadowRootHook of shadowAwareHost[shadowRootListenerHooksKey] ?? []) {
			shadowRootHook();
		}
		return shadowRoot;
	};

	shadowAwareHost[patchedAttachShadowKey] = true;
}

/**
 * Subscribes to a DOM event with delegation, window, or document targeting.
 * Functional equivalent of the `@onEvent` decorator for vanilla JS usage.
 * Returns a cleanup function to remove the listener.
 * @param host The host RadiantElement.
 * @param config The event listener configuration.
 * @param callback The event handler function.
 */
export function createEventListener(
	host: EventListenerHost,
	config: OnEventConfig,
	callback: (event: Event) => void,
): () => void {
	if (isControllerEventHost(host) && 'scope' in config && config.scope && config.scope !== 'light') {
		throw new Error('RadiantController event listeners only support light DOM scope.');
	}

	if (isServer) {
		return () => {};
	}

	const hostElement = resolveEventListenerHostElement(host);
	const boundCallback = callback.bind(host);
	let windowCleanup: (() => void) | null = null;
	let documentCleanup: (() => void) | null = null;
	let mediaQueryCleanup: (() => void) | null = null;
	let lightCleanup: (() => void) | null = null;
	let shadowCleanup: (() => void) | null = null;
	let disposed = false;

	const detachListeners = () => {
		windowCleanup?.();
		documentCleanup?.();
		mediaQueryCleanup?.();
		lightCleanup?.();
		shadowCleanup?.();

		windowCleanup = null;
		documentCleanup = null;
		mediaQueryCleanup = null;
		lightCleanup = null;
		shadowCleanup = null;
	};

	const attachListeners = () => {
		if (disposed) {
			return;
		}

		if ('window' in config && !windowCleanup) {
			window.addEventListener(config.type, boundCallback, config.options);
			windowCleanup = () => {
				window.removeEventListener(config.type, boundCallback, config.options);
			};
		}

		if ('document' in config && !documentCleanup) {
			document.addEventListener(config.type, boundCallback, config.options);
			documentCleanup = () => {
				document.removeEventListener(config.type, boundCallback, config.options);
			};
		}

		if ('mediaQuery' in config && !mediaQueryCleanup) {
			if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
				return;
			}

			const mediaQueryList = window.matchMedia(config.mediaQuery);
			mediaQueryList.addEventListener(config.type, boundCallback, config.options);
			mediaQueryCleanup = () => {
				mediaQueryList.removeEventListener(config.type, boundCallback, config.options);
			};
		}

		if ('selector' in config || 'ref' in config) {
			const selector = 'selector' in config ? config.selector : `[data-ref='${escapeCssIdentifier(config.ref)}']`;

			if (config.scope !== 'shadow' && !lightCleanup) {
				lightCleanup = addDelegatedListener(hostElement, config, selector, boundCallback);
			}

			if (config.scope !== 'light' && hostElement.shadowRoot && !shadowCleanup) {
				shadowCleanup = addDelegatedListener(hostElement.shadowRoot, config, selector, boundCallback);
			}
		}
	};

	if ('selector' in config || 'ref' in config) {
		if (config.scope !== 'light') {
			registerShadowRootHook(host, () => {
				if (host.isConnected) {
					attachListeners();
				}
			});
		}
	}

	host.registerConnectedCallback(attachListeners);
	host.registerCleanupCallback(detachListeners);

	if (host.isConnected) {
		attachListeners();
	}

	return () => {
		disposed = true;
		detachListeners();
	};
}
