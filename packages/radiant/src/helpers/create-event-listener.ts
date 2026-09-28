import { eventMatchesDelegatedSelector } from '../core/delegated-event';
import { isServer } from '@ecopages/radiant/is-server';
import { resolveHostElement } from './resolve-host-element';

/**
 * Event names known to reach a delegated listener on the host in the bubble phase.
 *
 * @remarks
 * Delegated listeners attach with `addEventListener(type, fn)` on the host, so
 * non-bubbling types never reach them. Use the bubbling twins (`focusin`,
 * `focusout`, `pointerover`, `pointerout`) or pass `options: { capture: true }`.
 * The open `(string & {})` branch keeps custom event names valid — `@event()`
 * emits with `bubbles: true, composed: true`.
 */
export type DelegatedEventType =
	| 'click'
	| 'dblclick'
	| 'input'
	| 'change'
	| 'submit'
	| 'reset'
	| 'focusin'
	| 'focusout'
	| 'keydown'
	| 'keyup'
	| 'pointerdown'
	| 'pointerup'
	| 'pointermove'
	| 'pointerover'
	| 'pointerout'
	| 'mousedown'
	| 'mouseup'
	| 'mousemove'
	| 'mouseover'
	| 'mouseout'
	| 'touchstart'
	| 'touchend'
	| 'touchmove'
	| 'touchcancel'
	| 'wheel'
	| (string & {});

/**
 * Bubbling replacements suggested for native events that never bubble.
 *
 * @remarks `load` / `unload` have no bubbling twin — callers should attach them
 * on `window` / `document` or pass `options: { capture: true }`.
 */
const NON_BUBBLING_DELEGATED_EVENTS = new Map<string, string>([
	['focus', 'focusin'],
	['blur', 'focusout'],
	['mouseenter', 'mouseover or pointerover'],
	['mouseleave', 'mouseout or pointerout'],
]);

const warnedNonBubblingEvents = new Set<string>();

/**
 * @remarks Development-only. Production builds (`NODE_ENV === "production"`) skip the diagnostic.
 */
function warnNonBubblingDelegatedEvent(type: string, options?: AddEventListenerOptions): void {
	if (process.env.NODE_ENV === 'production') {
		return;
	}

	const replacement = NON_BUBBLING_DELEGATED_EVENTS.get(type);
	if (!replacement || options?.capture || warnedNonBubblingEvents.has(type)) {
		return;
	}
	warnedNonBubblingEvents.add(type);

	if (typeof console === 'undefined') {
		return;
	}

	console.warn(
		`[@ecopages/radiant] Delegated @onEvent listens on the host in the bubble phase, so "${type}" will never reach it. Use "${replacement}" or pass \`options: { capture: true }\`.`,
	);
}

type BaseOnEventConfig = {
	type: DelegatedEventType;
	options?: AddEventListenerOptions;
};

/**
 * Configuration for `@onEvent` / `createEventListener`.
 *
 * @remarks
 * `selector` / `ref` delegate on the host in the bubble phase, so the `type`
 * must bubble (see {@link DelegatedEventType}). `window`, `document`, and
 * `mediaQuery` attach directly and accept any event name.
 */
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

type EventListenerLifecycleHost = {
	registerConnectedCallback(callback: () => void): void;
	registerCleanupCallback(callback: () => void): void;
	isConnected: boolean;
};

export type EventListenerHost =
	| (EventListenerLifecycleHost & Element)
	| (EventListenerLifecycleHost & { host: Element })
	| (EventListenerLifecycleHost & { element: Element });

function addDelegatedListener(
	root: Element,
	config: Pick<OnEventConfig, 'type' | 'options'>,
	selector: string,
	listener: EventListener,
): () => void {
	warnNonBubblingDelegatedEvent(config.type, config.options);

	const delegatedListener = (event: Event) => {
		if (eventMatchesDelegatedSelector(event, root, selector)) listener(event);
	};

	root.addEventListener(config.type, delegatedListener, config.options);

	return () => {
		root.removeEventListener(config.type, delegatedListener, config.options);
	};
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
	if (isServer) {
		return () => {};
	}

	const hostElement = resolveHostElement(host);
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
	if (!cleanups.has('delegated'))
		cleanups.set('delegated', addDelegatedListener(hostElement, config, selector, listener));
}

type EventListenerScope = 'delegated' | 'document' | 'media' | 'window';
