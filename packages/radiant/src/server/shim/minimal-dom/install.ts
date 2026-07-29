import { escapeCssIdentifier } from '../../tools/escape-css-identifier';
import { MinimalCustomElementsRegistry, MinimalDocument, type MinimalCustomElementRegistry } from './document';
import './html';
import {
	MinimalCustomEvent,
	MinimalElement,
	MinimalEvent,
	MinimalHtmlScriptElement,
	MinimalHTMLElement,
	MinimalNode,
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
};

/** Host preparation options accepted by the server render environment. */
export type PrepareServerRenderHostOptions = {
	/** Serialized light-DOM content to attach to the host before SSR. */
	authoredContent?: string;
};

/** Reusable SSR environment used to prepare component hosts before rendering. */
export type ServerRenderEnvironment = {
	/** Prepares the host instance for rendering, including authored light-DOM content. */
	prepareHost(host: HTMLElement, options?: PrepareServerRenderHostOptions): void;
};

let installedWindow: LightDomShimWindow | undefined;

const minimalCssNamespace: MinimalCssNamespace = {
	escape(value: string): string {
		return escapeCssIdentifier(String(value));
	},
};

function getExistingWindowLike(): LightDomShimWindow | undefined {
	const globalScope = globalThis as typeof globalThis & {
		CSS?: MinimalCssNamespace;
		CustomEvent?: typeof CustomEvent;
		Document?: typeof Document;
		Element?: typeof Element;
		Event?: typeof Event;
		EventTarget?: typeof EventTarget;
		HTMLScriptElement?: typeof HTMLScriptElement;
		HTMLElement?: typeof HTMLElement;
		Node?: typeof Node;
		document?: Document;
		customElements?: MinimalCustomElementRegistry;
		window?: LightDomShimWindow;
	};
	const existingCustomElements = globalScope.customElements;

	if (
		typeof globalScope.Node === 'undefined' ||
		typeof globalScope.Document === 'undefined' ||
		typeof globalScope.Element === 'undefined' ||
		typeof globalScope.HTMLElement === 'undefined' ||
		typeof globalScope.document === 'undefined' ||
		!existingCustomElements ||
		typeof existingCustomElements.define !== 'function' ||
		typeof existingCustomElements.get !== 'function'
	) {
		return undefined;
	}

	return (
		globalScope.window ?? {
			CSS: globalScope.CSS ?? minimalCssNamespace,
			CustomEvent: (globalScope.CustomEvent ?? MinimalCustomEvent) as typeof CustomEvent,
			Document: globalScope.Document,
			Element: globalScope.Element,
			Event: (globalScope.Event ?? MinimalEvent) as typeof Event,
			EventTarget: (globalScope.EventTarget ?? EventTarget) as typeof EventTarget,
			HTMLScriptElement: (globalScope.HTMLScriptElement ?? globalScope.HTMLElement) as typeof HTMLScriptElement,
			HTMLElement: globalScope.HTMLElement,
			Node: globalScope.Node,
			document: globalScope.document,
			customElements: existingCustomElements,
		}
	);
}

/** Ensures that a minimal window-like SSR runtime is available and returns it. */
export function ensureLightDomShim(): LightDomShimWindow {
	const existingWindow = getExistingWindowLike();

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
 * Installs the smallest global surface needed to instantiate Radiant custom elements during SSR.
 */
export function installLightDomShim(): LightDomShimWindow {
	const existingWindow = getExistingWindowLike();

	if (existingWindow) {
		return existingWindow;
	}

	if (installedWindow) {
		return installedWindow;
	}

	const customElements = new MinimalCustomElementsRegistry();
	const document = new MinimalDocument() as unknown as Document;
	const EventConstructor = (globalThis.Event ?? MinimalEvent) as typeof Event;
	const CustomEventConstructor = (globalThis.CustomEvent ?? MinimalCustomEvent) as typeof CustomEvent;
	const DocumentConstructor = MinimalDocument as unknown as typeof Document;
	const EventTargetConstructor = (globalThis.EventTarget ?? EventTarget) as typeof EventTarget;
	installedWindow = {
		CSS: (globalThis.CSS as MinimalCssNamespace | undefined) ?? minimalCssNamespace,
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
	};

	Object.assign(globalThis, {
		CSS: (globalThis.CSS as MinimalCssNamespace | undefined) ?? minimalCssNamespace,
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
	});

	return installedWindow;
}
