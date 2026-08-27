import type { RadiantElementEventListener } from '../core/radiant-element';
import { eventMatchesDelegatedSelector } from '../core/delegated-event';
import { isServer } from '@ecopages/radiant/is-server';
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
		if (eventMatchesDelegatedSelector(event, root, selector)) listener(event);
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
	const cleanups = new Map<EventListenerScope, () => void>();
	let disposed = false;

	const detachListeners = () => {
		for (const cleanup of cleanups.values()) cleanup();
		cleanups.clear();
	};

	const attachListeners = () => {
		if (!disposed) attachConfiguredListeners(cleanups, hostElement, config, boundCallback);
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

function attachConfiguredListeners(
	cleanups: Map<EventListenerScope, () => void>,
	hostElement: Element,
	config: OnEventConfig,
	listener: EventListener,
): void {
	if ('window' in config) attachNativeListener(cleanups, 'window', window, config, listener);
	if ('document' in config) attachNativeListener(cleanups, 'document', document, config, listener);
	if ('mediaQuery' in config) attachMediaQueryListener(cleanups, config, listener);
	if ('selector' in config || 'ref' in config) attachDelegatedListeners(cleanups, hostElement, config, listener);
}

function attachNativeListener(
	cleanups: Map<EventListenerScope, () => void>,
	key: 'document' | 'window',
	target: Window | Document,
	config: OnEventConfig,
	listener: EventListener,
): void {
	if (cleanups.has(key)) return;
	target.addEventListener(config.type, listener, config.options);
	cleanups.set(key, () => target.removeEventListener(config.type, listener, config.options));
}

function attachMediaQueryListener(
	cleanups: Map<EventListenerScope, () => void>,
	config: OnEventConfig,
	listener: EventListener,
): void {
	if (
		!('mediaQuery' in config) ||
		cleanups.has('media') ||
		typeof window === 'undefined' ||
		typeof window.matchMedia !== 'function'
	)
		return;
	const mediaQueryList = window.matchMedia(config.mediaQuery);
	mediaQueryList.addEventListener(config.type, listener, config.options);
	cleanups.set('media', () => mediaQueryList.removeEventListener(config.type, listener, config.options));
}

function attachDelegatedListeners(
	cleanups: Map<EventListenerScope, () => void>,
	hostElement: Element,
	config: OnEventConfig,
	listener: EventListener,
): void {
	if (!('selector' in config || 'ref' in config)) return;
	const selector = 'selector' in config ? config.selector : `[data-ref='${CSS.escape(config.ref)}']`;
	if (config.scope !== 'shadow' && !cleanups.has('light'))
		cleanups.set('light', addDelegatedListener(hostElement, config, selector, listener));
	if (config.scope !== 'light' && hostElement.shadowRoot && !cleanups.has('shadow'))
		cleanups.set('shadow', addDelegatedListener(hostElement.shadowRoot, config, selector, listener));
}

type EventListenerScope = 'document' | 'light' | 'media' | 'shadow' | 'window';
