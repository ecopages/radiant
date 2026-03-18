type MinimalCustomElementRegistry = {
	define(name: string, constructor: CustomElementConstructor, options?: ElementDefinitionOptions): void;
	get(name: string): CustomElementConstructor | undefined;
};

type MinimalWindow = {
	customElements: MinimalCustomElementRegistry;
};

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

/**
 * Installs the smallest global surface needed to instantiate Radiant custom elements during SSR.
 */
export function installLightDomShim(): MinimalWindow {
	if (installedWindow) {
		return installedWindow;
	}

	const customElements = new MinimalCustomElementsRegistry();
	installedWindow = { customElements };

	Object.assign(globalThis, {
		HTMLElement: MinimalHTMLElement,
		customElements,
		window: installedWindow,
	});

	return installedWindow;
}
