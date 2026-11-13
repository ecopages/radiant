import { eventMatchesDelegatedSelector } from '../core/delegated-event';
import { isServer } from '@ecopages/radiant/is-server';
import { areJsxDevWarningsEnabled } from './dev-warnings';
import { resolveHostElement } from './resolve-host-element';

/**
 * Event names known to reach a delegated listener on the host in the bubble phase.
 *
 * @remarks
 * Delegated listeners attach with `addEventListener(type, fn)` on the host, so
 * non-bubbling types never reach them. Use the bubbling twins (`focusin`,
 * `focusout`, `pointerover`, `pointerout`) or pass `options: { capture: true }`.
 * The open `(string & {})` branch keeps custom event names valid.
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
function getNonBubblingReplacement(type: string): string | undefined {
	switch (type) {
		case 'focus':
			return 'focusin';
		case 'blur':
			return 'focusout';
		case 'mouseenter':
			return 'mouseover or pointerover';
		case 'mouseleave':
			return 'mouseout or pointerout';
		case 'pointerenter':
			return 'pointerover, or `{ host: true }` for the host itself';
		case 'pointerleave':
			return 'pointerout, or `{ host: true }` for the host itself';
		default:
			return undefined;
	}
}

let warnedNonBubblingEvents: Set<string> | undefined;

/**
 * @remarks
 * Development-only: the consumer's bundler decides by replacing `process.env.NODE_ENV`,
 * and a `"production"` build drops the whole block. The `try` keeps an unbundled browser
 * load, where `process` does not exist, from throwing. The check wraps the warning instead of
 * returning early, because some bundlers (Rollup) keep the code after an early `return`
 * inside a `try`.
 */
function warnNonBubblingDelegatedEvent(type: string, options?: AddEventListenerOptions): void {
	try {
		if (process.env.NODE_ENV !== 'production' && areJsxDevWarningsEnabled()) {
			const replacement = getNonBubblingReplacement(type);
			if (!replacement || options?.capture) {
				return;
			}

			const warnedEvents = (warnedNonBubblingEvents ??= new Set<string>());
			if (warnedEvents.has(type)) return;
			warnedEvents.add(type);

			console.warn(
				`[@ecopages/radiant] Delegated @onEvent listens on the host in the bubble phase, so "${type}" will never reach it. Use "${replacement}" or pass \`options: { capture: true }\`.`,
			);
		}
	} catch {}
}

type BaseOnEventConfig = {
	type: DelegatedEventType;
	options?: AddEventListenerOptions;
};

type EventTargetKeys = {
	selector: string;
	ref: string;
	host: true;
	window: true;
	document: true;
	mediaQuery: string;
};

/** Exactly one target key from {@link EventTargetKeys}; the others are typed `never`. */
type OneEventTarget = {
	[Key in keyof EventTargetKeys]: Pick<EventTargetKeys, Key> & {
		[Other in Exclude<keyof EventTargetKeys, Key>]?: never;
	};
}[keyof EventTargetKeys];

/**
 * Configuration for `@onEvent` / `createEventListener`.
 *
 * @remarks
 * Takes exactly one target. `selector` / `ref` delegate on the host in the bubble phase, so the
 * `type` must bubble (see {@link DelegatedEventType}). `host`, `window`, `document`, and
 * `mediaQuery` attach directly and accept any event name, so `host: true` is the form for
 * non-bubbling events such as `pointerenter` on the Element Host itself.
 */
export type OnEventConfig = BaseOnEventConfig & OneEventTarget;

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
	if (config.host) attachNativeListener(cleanups, 'host', hostElement, config, listener);
	if (config.window) attachNativeListener(cleanups, 'window', window, config, listener);
	if (config.document) attachNativeListener(cleanups, 'document', document, config, listener);
	if (config.mediaQuery !== undefined) attachMediaQueryListener(cleanups, config.mediaQuery, config, listener);
	if (config.selector !== undefined || config.ref !== undefined)
		attachDelegatedListeners(cleanups, hostElement, config, listener);
}

function attachNativeListener(
	cleanups: Map<EventListenerScope, () => void>,
	key: 'document' | 'host' | 'window',
	target: Window | Document | Element,
	config: OnEventConfig,
	listener: EventListener,
): void {
	if (cleanups.has(key)) return;
	target.addEventListener(config.type, listener, config.options);
	cleanups.set(key, () => target.removeEventListener(config.type, listener, config.options));
}

function attachMediaQueryListener(
	cleanups: Map<EventListenerScope, () => void>,
	mediaQuery: string,
	config: OnEventConfig,
	listener: EventListener,
): void {
	if (cleanups.has('media') || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
	const mediaQueryList = window.matchMedia(mediaQuery);
	mediaQueryList.addEventListener(config.type, listener, config.options);
	cleanups.set('media', () => mediaQueryList.removeEventListener(config.type, listener, config.options));
}

function attachDelegatedListeners(
	cleanups: Map<EventListenerScope, () => void>,
	hostElement: Element,
	config: OnEventConfig,
	listener: EventListener,
): void {
	const selector =
		config.selector ?? (config.ref === undefined ? undefined : `[data-ref='${CSS.escape(config.ref)}']`);
	if (selector === undefined) return;
	if (!cleanups.has('delegated'))
		cleanups.set('delegated', addDelegatedListener(hostElement, config, selector, listener));
}

type EventListenerScope = 'delegated' | 'document' | 'host' | 'media' | 'window';
