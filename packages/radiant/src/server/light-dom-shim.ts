type MinimalCustomElementRegistry = {
	define(name: string, constructor: CustomElementConstructor, options?: ElementDefinitionOptions): void;
	get(name: string): CustomElementConstructor | undefined;
};

type MinimalWindow = {
	CustomEvent: typeof CustomEvent;
	Event: typeof Event;
	EventTarget: typeof EventTarget;
	HTMLElement: typeof HTMLElement;
	customElements: MinimalCustomElementRegistry;
};

class MinimalEvent {
	public readonly bubbles: boolean;
	public readonly cancelable: boolean;
	public readonly composed: boolean;
	public readonly type: string;

	constructor(type: string, eventInitDict: EventInit = {}) {
		this.type = type;
		this.bubbles = eventInitDict.bubbles ?? false;
		this.cancelable = eventInitDict.cancelable ?? false;
		this.composed = eventInitDict.composed ?? false;
	}
}

class MinimalCustomEvent<T = unknown> extends MinimalEvent {
	public readonly detail: T;

	constructor(type: string, eventInitDict: CustomEventInit<T> = {}) {
		super(type, eventInitDict);
		this.detail = eventInitDict.detail as T;
	}
}

class MinimalHTMLElement extends EventTarget {
	private attributes = new Map<string, string>();

	public innerHTML = '';
	public isConnected = false;

	hasAttribute(name: string): boolean {
		return this.attributes.has(name);
	}

	getAttribute(name: string): string | null {
		return this.attributes.get(name) ?? null;
	}

	getAttributeNames(): string[] {
		return Array.from(this.attributes.keys());
	}

	setAttribute(name: string, value: unknown): void {
		this.attributes.set(name, String(value));
	}

	removeAttribute(name: string): void {
		this.attributes.delete(name);
	}

	insertAdjacentHTML(_position: InsertPosition, html: string): void {
		this.innerHTML += html;
	}

	querySelector(): Element | null {
		return null;
	}

	querySelectorAll(): Element[] {
		return [];
	}

	matches(): boolean {
		return false;
	}

	connectedCallback?(): void;
	attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
	disconnectedCallback?(): void;
}

class MinimalCustomElementsRegistry implements MinimalCustomElementRegistry {
	private definitions = new Map<string, CustomElementConstructor>();

	define(name: string, constructor: CustomElementConstructor): void {
		if (this.definitions.has(name)) {
			return;
		}

		this.definitions.set(name, constructor);
	}

	get(name: string): CustomElementConstructor | undefined {
		return this.definitions.get(name);
	}
}

let installedWindow: MinimalWindow | undefined;

function getExistingWindowLike(): MinimalWindow | undefined {
	const globalScope = globalThis as typeof globalThis & {
		CustomEvent?: typeof CustomEvent;
		Event?: typeof Event;
		EventTarget?: typeof EventTarget;
		HTMLElement?: typeof HTMLElement;
		customElements?: MinimalCustomElementRegistry;
		window?: MinimalWindow;
	};
	const existingCustomElements = globalScope.customElements;

	if (
		typeof globalScope.HTMLElement === 'undefined' ||
		!existingCustomElements ||
		typeof existingCustomElements.define !== 'function' ||
		typeof existingCustomElements.get !== 'function'
	) {
		return undefined;
	}

	return (
		globalScope.window ?? {
			CustomEvent: (globalScope.CustomEvent ?? MinimalCustomEvent) as typeof CustomEvent,
			Event: (globalScope.Event ?? MinimalEvent) as typeof Event,
			EventTarget: (globalScope.EventTarget ?? EventTarget) as typeof EventTarget,
			HTMLElement: globalScope.HTMLElement,
			customElements: existingCustomElements,
		}
	);
}

export function ensureLightDomShim(): MinimalWindow {
	const existingWindow = getExistingWindowLike();

	if (existingWindow) {
		return existingWindow;
	}

	return installLightDomShim();
}

/**
 * Installs the smallest global surface needed to instantiate Radiant custom elements during SSR.
 */
export function installLightDomShim(): MinimalWindow {
	const existingWindow = getExistingWindowLike();

	if (existingWindow) {
		return existingWindow;
	}

	if (installedWindow) {
		return installedWindow;
	}

	const customElements = new MinimalCustomElementsRegistry();
	const EventConstructor = (globalThis.Event ?? MinimalEvent) as typeof Event;
	const CustomEventConstructor = (globalThis.CustomEvent ?? MinimalCustomEvent) as typeof CustomEvent;
	const EventTargetConstructor = (globalThis.EventTarget ?? EventTarget) as typeof EventTarget;
	installedWindow = {
		CustomEvent: CustomEventConstructor,
		Event: EventConstructor,
		EventTarget: EventTargetConstructor,
		HTMLElement: MinimalHTMLElement as unknown as typeof HTMLElement,
		customElements,
	};

	Object.assign(globalThis, {
		CustomEvent: CustomEventConstructor,
		Event: EventConstructor,
		EventTarget: EventTargetConstructor,
		HTMLElement: MinimalHTMLElement,
		customElements,
		window: installedWindow,
	});

	return installedWindow;
}
