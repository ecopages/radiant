export const CUSTOM_ELEMENT_TAG_NAME = Symbol.for('@ecopages/radiant.customElementTagName');

type CustomElementConstructorWithMetadata = CustomElementConstructor & {
	[CUSTOM_ELEMENT_TAG_NAME]?: string;
};

/**
 * Sets the custom element tag name for a given constructor.
 * This is used internally to associate a class with its custom element tag, which is necessary for features like hydration and SSR support.
 * @param target The constructor of the custom element.
 * @param tagName The tag name to associate with the custom element.
 */
export function setCustomElementTagName(target: CustomElementConstructor, tagName: string): void {
	(target as CustomElementConstructorWithMetadata)[CUSTOM_ELEMENT_TAG_NAME] = tagName;
}

/**
 * Retrieves the custom element tag name associated with a given constructor.
 * @param target The constructor of the custom element.
 * @returns The tag name associated with the custom element, or `undefined` if not set.
 */
export function getCustomElementTagName(target: CustomElementConstructor): string | undefined {
	return (target as CustomElementConstructorWithMetadata)[CUSTOM_ELEMENT_TAG_NAME];
}
