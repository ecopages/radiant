import {
	MinimalCommentNode,
	MinimalHtmlScriptElement,
	MinimalHTMLElement,
	MinimalNode,
	MinimalTextNode,
} from './nodes';
import * as selectors from './selectors';

export type MinimalCustomElementRegistry = {
	define(name: string, constructor: CustomElementConstructor, options?: ElementDefinitionOptions): void;
	get(name: string): CustomElementConstructor | undefined;
	getName?(constructor: CustomElementConstructor): string | undefined;
};

export class MinimalDocument extends MinimalNode {
	constructor() {
		super(MinimalNode.DOCUMENT_NODE);
	}

	/**
	 * @remarks A registered custom-element tag still returns a generic minimal element. The class is not
	 * constructed and its view is not serialized; constructing here would also run when the parser rebuilds
	 * host HTML. Use JSX for nested hosts that must server-render.
	 */
	createElement(tagName: string): HTMLElement {
		return (tagName.toLowerCase() === 'script'
			? new MinimalHtmlScriptElement(this as unknown as Document)
			: new MinimalHTMLElement(tagName, this as unknown as Document)) as unknown as HTMLElement;
	}

	/**
	 * @remarks The minimal DOM has no namespaces: SVG and MathML elements are plain elements, which serialize the same.
	 */
	createElementNS(_namespaceURI: string | null, qualifiedName: string): Element {
		return this.createElement(qualifiedName) as unknown as Element;
	}

	createTextNode(value: string): Text {
		return new MinimalTextNode(value, this as unknown as Document) as unknown as Text;
	}

	createComment(data: string): Comment {
		return new MinimalCommentNode(data, this as unknown as Document) as unknown as Comment;
	}

	querySelector(selector: string): Element | null {
		return selectors.querySelector(this, selector) as unknown as Element | null;
	}

	querySelectorAll(selector: string): Element[] {
		return selectors.querySelectorAll(this, selector) as unknown as Element[];
	}

	getElementById(id: string): HTMLElement | null {
		return this.querySelector(`[id="${id.replace(/"/g, '\\"')}"]`) as HTMLElement | null;
	}
}

export class MinimalCustomElementsRegistry implements MinimalCustomElementRegistry {
	private definitions = new Map<string, CustomElementConstructor>();
	private names = new WeakMap<CustomElementConstructor, string>();

	define(name: string, constructor: CustomElementConstructor): void {
		if (this.definitions.has(name)) {
			return;
		}

		this.definitions.set(name, constructor);
		this.names.set(constructor, name);
	}

	get(name: string): CustomElementConstructor | undefined {
		return this.definitions.get(name);
	}

	getName(constructor: CustomElementConstructor): string | undefined {
		return this.names.get(constructor);
	}
}
