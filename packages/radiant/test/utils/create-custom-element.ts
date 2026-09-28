export type CustomElementTagName = `${string}-${string}`;

export function createCustomElement<T extends HTMLElement>(tagName: CustomElementTagName): T {
	return document.createElement(tagName) as T;
}
