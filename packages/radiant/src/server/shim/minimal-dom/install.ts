import { escapeCssIdentifier } from '../../../tools/escape-css-identifier';
import { MinimalCustomElementsRegistry, MinimalDocument, type MinimalCustomElementRegistry } from './document';
import './html';
import {
	MinimalCustomEvent,
	MinimalElement,
	MinimalEvent,
	MinimalHtmlScriptElement,
	MinimalHTMLElement,
	MinimalNode,
	MinimalEventTarget,
} from './nodes';

type MinimalCssNamespace = {
	escape(value: string): string;
};

/**
 * Minimal window-like runtime surface exposed by the SSR light-DOM shim.
 *
 * This is intentionally much smaller than a browser `window`; it only includes
 * the constructors and registry access that Radiant SSR currently needs.
 */
export type LightDomShimWindow = {
	/** Event constructor exposed to SSR-created components. */
	CustomEvent: typeof CustomEvent;
	/** Document constructor exposed to SSR-created components. */
	Document: typeof Document;
	/** Element constructor exposed to SSR-created components. */
	Element: typeof Element;
	/** Event constructor exposed to SSR-created components. */
	Event: typeof Event;
	/** EventTarget constructor exposed to SSR-created components. */
	EventTarget: typeof EventTarget;
	/** HTMLScriptElement constructor used by slot projection payload parsing. */
	HTMLScriptElement: typeof HTMLScriptElement;
	/** HTMLElement constructor exposed to SSR-created components. */
	HTMLElement: typeof HTMLElement;
	/** Node constructor exposed to SSR-created components. */
	Node: typeof Node;
	/** Minimal document instance exposed to SSR-created components. */
	document: Document;
	/** Minimal CSS namespace exposed to SSR-created components. */
	CSS: MinimalCssNamespace;
	/** Custom element registry used while rendering in SSR. */
	customElements: MinimalCustomElementRegistry;
	/** Animation-frame callback used by SSR layout-aware components. */
	requestAnimationFrame: typeof requestAnimationFrame;
	/** Animation-frame cancellation function used by SSR layout-aware components. */
	cancelAnimationFrame: typeof cancelAnimationFrame;
};

/** Host preparation options accepted by the server render environment. */
export type PrepareServerRenderHostOptions = {
	/**
	 * Serialized light-DOM content to attach to the host before SSR.
	 * Trusted author HTML — not for untrusted user input.
	 */
	authoredContent?: string;
};

/** Reusable SSR environment used to prepare component hosts before rendering. */
export type ServerRenderEnvironment = {
	/** Prepares the host instance for rendering, including authored light-DOM content. */
	prepareHost(host: HTMLElement, options?: PrepareServerRenderHostOptions): void;
};

type GlobalDomScope = typeof globalThis & {
	CSS?: MinimalCssNamespace;
	CustomEvent?: typeof CustomEvent;
	Document?: typeof Document;
	Element?: typeof Element;
	Event?: typeof Event;
	EventTarget?: typeof EventTarget;
	HTMLScriptElement?: typeof HTMLScriptElement;
	HTMLElement?: typeof HTMLElement;
	Node?: typeof Node;
	document?: Document | null;
	customElements?: MinimalCustomElementRegistry;
	window?: unknown;
	requestAnimationFrame?: typeof requestAnimationFrame;
	cancelAnimationFrame?: typeof cancelAnimationFrame;
};

const minimalCssNamespace: MinimalCssNamespace = {
	escape(value: string): string {
		return escapeCssIdentifier(String(value));
	},
};

function isObjectLike(value: unknown): value is Record<PropertyKey, unknown> {
	return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function getCssNamespace(globalScope: GlobalDomScope): MinimalCssNamespace {
	try {
		return isObjectLike(globalScope.CSS) && typeof globalScope.CSS.escape === 'function'
			? globalScope.CSS
			: minimalCssNamespace;
	} catch {
		return minimalCssNamespace;
	}
}

function hasUsableElementSurface(value: unknown, verifyStyleOperation = false): boolean {
	if (!isObjectLike(value)) {
		return false;
	}

	try {
		const style = value.style;
		const children = value.children;
		if (!isObjectLike(style) || !isObjectLike(children)) {
			return false;
		}
		const setProperty = style.setProperty;
		const removeProperty = style.removeProperty;
		if (typeof setProperty !== 'function' || typeof children[Symbol.iterator] !== 'function') {
			return false;
		}

		if (verifyStyleOperation) {
			setProperty.call(style, '--radiant-dom-probe', '');
			if (typeof removeProperty === 'function') {
				removeProperty.call(style, '--radiant-dom-probe');
			}
		}
		return true;
	} catch {
		return false;
	}
}

function createWindowSurface(
	globalScope: GlobalDomScope,
	customElements: MinimalCustomElementRegistry,
): LightDomShimWindow {
	const surface: LightDomShimWindow = {
		CSS: getCssNamespace(globalScope),
		CustomEvent: (typeof globalScope.CustomEvent === 'function'
			? globalScope.CustomEvent
			: MinimalCustomEvent) as typeof CustomEvent,
		Document: globalScope.Document as typeof Document,
		Element: globalScope.Element as typeof Element,
		Event: (typeof globalScope.Event === 'function' ? globalScope.Event : MinimalEvent) as typeof Event,
		EventTarget: (typeof globalScope.EventTarget === 'function'
			? globalScope.EventTarget
			: MinimalEventTarget) as typeof EventTarget,
		HTMLScriptElement: (typeof globalScope.HTMLScriptElement === 'function'
			? globalScope.HTMLScriptElement
			: globalScope.HTMLElement) as typeof HTMLScriptElement,
		HTMLElement: globalScope.HTMLElement as typeof HTMLElement,
		Node: globalScope.Node as typeof Node,
		document: globalScope.document as Document,
		customElements,
		requestAnimationFrame: globalScope.requestAnimationFrame as typeof requestAnimationFrame,
		cancelAnimationFrame: globalScope.cancelAnimationFrame as typeof cancelAnimationFrame,
	};

	const candidate = globalScope.window;
	if (!isObjectLike(candidate)) {
		return surface;
	}

	try {
		if (
			candidate.CSS === surface.CSS &&
			candidate.CustomEvent === surface.CustomEvent &&
			candidate.Document === surface.Document &&
			candidate.Element === surface.Element &&
			candidate.Event === surface.Event &&
			candidate.EventTarget === surface.EventTarget &&
			candidate.HTMLScriptElement === surface.HTMLScriptElement &&
			candidate.HTMLElement === surface.HTMLElement &&
			candidate.Node === surface.Node &&
			candidate.document === surface.document &&
			candidate.customElements === surface.customElements &&
			candidate.requestAnimationFrame === surface.requestAnimationFrame &&
			candidate.cancelAnimationFrame === surface.cancelAnimationFrame
		) {
			return candidate as unknown as LightDomShimWindow;
		}
	} catch {
		return surface;
	}

	return surface;
}

function getCompleteDomWindow(): LightDomShimWindow | undefined {
	const globalScope = globalThis as GlobalDomScope;
	let NodeConstructor: GlobalDomScope['Node'];
	let DocumentConstructor: GlobalDomScope['Document'];
	let ElementConstructor: GlobalDomScope['Element'];
	let HTMLElementConstructor: GlobalDomScope['HTMLElement'];
	let document: GlobalDomScope['document'];
	let customElements: GlobalDomScope['customElements'];
	let EventConstructor: GlobalDomScope['Event'];
	let CustomEventConstructor: GlobalDomScope['CustomEvent'];
	let EventTargetConstructor: GlobalDomScope['EventTarget'];
	let requestAnimationFrame: GlobalDomScope['requestAnimationFrame'];
	let cancelAnimationFrame: GlobalDomScope['cancelAnimationFrame'];

	try {
		NodeConstructor = globalScope.Node;
		DocumentConstructor = globalScope.Document;
		ElementConstructor = globalScope.Element;
		HTMLElementConstructor = globalScope.HTMLElement;
		document = globalScope.document;
		customElements = globalScope.customElements;
		EventConstructor = globalScope.Event;
		CustomEventConstructor = globalScope.CustomEvent;
		EventTargetConstructor = globalScope.EventTarget;
		requestAnimationFrame = globalScope.requestAnimationFrame;
		cancelAnimationFrame = globalScope.cancelAnimationFrame;
	} catch {
		return undefined;
	}

	if (
		typeof NodeConstructor !== 'function' ||
		typeof DocumentConstructor !== 'function' ||
		typeof ElementConstructor !== 'function' ||
		typeof HTMLElementConstructor !== 'function' ||
		!isObjectLike(document) ||
		!isObjectLike(customElements) ||
		typeof EventConstructor !== 'function' ||
		typeof CustomEventConstructor !== 'function' ||
		typeof EventTargetConstructor !== 'function'
	) {
		return undefined;
	}

	let elementProbe: unknown;
	let customElementProbe: unknown;

	try {
		if (
			typeof document.createElement !== 'function' ||
			typeof document.getElementById !== 'function' ||
			typeof customElements.define !== 'function' ||
			typeof customElements.get !== 'function' ||
			typeof requestAnimationFrame !== 'function' ||
			typeof cancelAnimationFrame !== 'function'
		) {
			return undefined;
		}
		elementProbe = document.createElement('div');
		/**
		 * @remarks Browser-like runtimes can reject direct construction of an unregistered
		 * custom element, so the probe uses the subclass prototype without mutating the registry.
		 */
		class ProbeHost extends HTMLElementConstructor {}
		customElementProbe = Object.create(ProbeHost.prototype);
	} catch {
		return undefined;
	}

	if (!hasUsableElementSurface(elementProbe, true) || !hasUsableElementSurface(customElementProbe)) {
		return undefined;
	}

	try {
		return createWindowSurface(globalScope, customElements);
	} catch {
		return undefined;
	}
}

function canWriteGlobalProperty(property: string): boolean {
	const descriptor = Object.getOwnPropertyDescriptor(globalThis, property);
	if (!descriptor) {
		return Object.isExtensible(globalThis);
	}

	return 'writable' in descriptor ? descriptor.writable === true : typeof descriptor.set === 'function';
}

function assignGlobalSurface(surface: Record<string, unknown>): void {
	const updates = Object.entries(surface).filter(([property, value]) => {
		try {
			return (globalThis as Record<string, unknown>)[property] !== value;
		} catch {
			return true;
		}
	});
	const lockedProperties = updates
		.filter(([property]) => !canWriteGlobalProperty(property))
		.map(([property]) => property);

	if (lockedProperties.length > 0) {
		throw new Error(
			`Radiant SSR cannot install its minimal DOM because these global properties are not writable: ${lockedProperties.join(', ')}`,
		);
	}

	Object.assign(globalThis, Object.fromEntries(updates));
}

/** Ensures that a minimal window-like SSR runtime is available and returns it. */
export function ensureLightDomShim(): LightDomShimWindow {
	const existingWindow = getCompleteDomWindow();
	if (existingWindow) {
		return existingWindow;
	}

	return installLightDomShim();
}

/**
 * Creates a reusable SSR environment that can prepare a component host with
 * authored light-DOM content before rendering.
 *
 * Adapters can reuse a single environment across multiple render calls when
 * they want a single host-preparation entrypoint backed by the installed shim.
 */
export function createServerRenderEnvironment(): ServerRenderEnvironment {
	ensureLightDomShim();

	return {
		prepareHost(host: HTMLElement, options: PrepareServerRenderHostOptions = {}): void {
			if (options.authoredContent !== undefined) {
				host.innerHTML = options.authoredContent;
			}
		},
	};
}

/**
 * Ensures that Radiant custom elements can be instantiated during SSR.
 *
 * @remarks
 * A complete existing DOM is reused without mutation. Missing or partial DOM globals are
 * replaced with Radiant's coherent minimal DOM surface. Import
 * `@ecopages/radiant/server/install-ssr-runtime` before any Radiant element module in
 * SSR bundles because `RadiantElement` captures its base class at module evaluation.
 */
export function installLightDomShim(): LightDomShimWindow {
	const existingWindow = getCompleteDomWindow();
	if (existingWindow) {
		return existingWindow;
	}

	const globalScope = globalThis as GlobalDomScope;
	const customElements = new MinimalCustomElementsRegistry();
	const document = new MinimalDocument() as unknown as Document;
	const EventConstructor = (
		typeof globalScope.Event === 'function' ? globalScope.Event : MinimalEvent
	) as typeof Event;
	const CustomEventConstructor = (
		typeof globalScope.CustomEvent === 'function' ? globalScope.CustomEvent : MinimalCustomEvent
	) as typeof CustomEvent;
	const DocumentConstructor = MinimalDocument as unknown as typeof Document;
	const EventTargetConstructor = MinimalEventTarget as typeof EventTarget;
	const requestAnimationFrame =
		typeof globalScope.requestAnimationFrame === 'function'
			? globalScope.requestAnimationFrame
			: (_callback: FrameRequestCallback): number => 0;
	const cancelAnimationFrame =
		typeof globalScope.cancelAnimationFrame === 'function'
			? globalScope.cancelAnimationFrame
			: (_handle: number): void => {};
	const installedWindow: LightDomShimWindow = {
		CSS: getCssNamespace(globalScope),
		CustomEvent: CustomEventConstructor,
		Document: DocumentConstructor,
		Element: MinimalElement as unknown as typeof Element,
		Event: EventConstructor,
		EventTarget: EventTargetConstructor,
		HTMLScriptElement: MinimalHtmlScriptElement as unknown as typeof HTMLScriptElement,
		HTMLElement: MinimalHTMLElement as unknown as typeof HTMLElement,
		Node: MinimalNode as unknown as typeof Node,
		document,
		customElements,
		requestAnimationFrame,
		cancelAnimationFrame,
	};

	assignGlobalSurface({
		CSS: installedWindow.CSS,
		CustomEvent: CustomEventConstructor,
		Document: DocumentConstructor,
		Element: MinimalElement,
		Event: EventConstructor,
		EventTarget: EventTargetConstructor,
		HTMLScriptElement: MinimalHtmlScriptElement,
		HTMLElement: MinimalHTMLElement,
		Node: MinimalNode,
		document,
		customElements,
		window: installedWindow,
		requestAnimationFrame,
		cancelAnimationFrame,
	});

	return installedWindow;
}
