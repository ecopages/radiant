import type { RadiantElement } from '../core/radiant-element';
import type { RadiantElementEventListener } from '../core/radiant-element';

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
	);

type DelegatedEventRoot = HTMLElement | ShadowRoot;

const shadowRootListenerHooksKey = Symbol('radiant.shadowRootListenerHooks');
const patchedAttachShadowKey = Symbol('radiant.patchedAttachShadow');

type ShadowRootHookHost = RadiantElement & {
	[patchedAttachShadowKey]?: true;
	[shadowRootListenerHooksKey]?: Set<() => void>;
};

function addDelegatedListener(
	root: DelegatedEventRoot,
	config: Pick<OnEventConfig, 'type' | 'options'>,
	selector: string,
	listener: EventListener,
): () => void {
	const delegatedListener = (event: Event) => {
		if (event.target instanceof Element && event.target.matches(selector)) {
			listener(event);
		}
	};

	root.addEventListener(config.type, delegatedListener, config.options);

	return () => {
		root.removeEventListener(config.type, delegatedListener, config.options);
	};
}

function registerShadowRootHook(host: RadiantElement, hook: () => void): void {
	const shadowAwareHost = host as ShadowRootHookHost;

	if (!shadowAwareHost[shadowRootListenerHooksKey]) {
		shadowAwareHost[shadowRootListenerHooksKey] = new Set();
	}

	shadowAwareHost[shadowRootListenerHooksKey].add(hook);

	if (shadowAwareHost[patchedAttachShadowKey]) {
		return;
	}

	const originalAttachShadow = host.attachShadow;

	host.attachShadow = function patchedAttachShadow(init: ShadowRootInit): ShadowRoot {
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
	host: RadiantElement,
	config: OnEventConfig,
	callback: (event: Event) => void,
): () => void {
	const boundCallback = callback.bind(host);
	let windowCleanup: (() => void) | null = null;
	let documentCleanup: (() => void) | null = null;
	let lightCleanup: (() => void) | null = null;
	let shadowCleanup: (() => void) | null = null;
	let disposed = false;

	const detachListeners = () => {
		windowCleanup?.();
		documentCleanup?.();
		lightCleanup?.();
		shadowCleanup?.();

		windowCleanup = null;
		documentCleanup = null;
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

		if ('selector' in config || 'ref' in config) {
			const selector = 'selector' in config ? config.selector : `[data-ref='${CSS.escape(config.ref)}']`;

			if (config.scope !== 'shadow' && !lightCleanup) {
				lightCleanup = addDelegatedListener(host, config, selector, boundCallback);
			}

			if (config.scope !== 'light' && host.shadowRoot && !shadowCleanup) {
				shadowCleanup = addDelegatedListener(host.shadowRoot, config, selector, boundCallback);
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
