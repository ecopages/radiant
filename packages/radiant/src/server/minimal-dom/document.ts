import { MinimalHtmlScriptElement, MinimalHTMLElement, MinimalNode, MinimalTextNode } from './nodes';

export type MinimalCustomElementRegistry = {
	define(name: string, constructor: CustomElementConstructor, options?: ElementDefinitionOptions): void;
	get(name: string): CustomElementConstructor | undefined;
};

export class MinimalDocument extends MinimalNode {
	constructor() {
		super(MinimalNode.DOCUMENT_NODE);
	}

	createElement(tagName: string): HTMLElement {
		return (tagName.toLowerCase() === 'script'
			? new MinimalHtmlScriptElement(this as unknown as Document)
			: new MinimalHTMLElement(tagName, this as unknown as Document)) as unknown as HTMLElement;
	}

	createTextNode(value: string): Text {
		return new MinimalTextNode(value, this as unknown as Document) as unknown as Text;
	}

	querySelector(): Element | null {
		return null;
	}

	querySelectorAll(): Element[] {
		return [];
	}
}

export class MinimalCustomElementsRegistry implements MinimalCustomElementRegistry {
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
