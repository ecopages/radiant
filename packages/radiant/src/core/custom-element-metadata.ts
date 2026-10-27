import { CUSTOM_ELEMENT_TAG_NAME } from '@ecopages/jsx';

type CustomElementConstructorWithMetadata = CustomElementConstructor & {
	[CUSTOM_ELEMENT_TAG_NAME]?: string;
};

/**
 * Sets the custom element tag name for a given constructor.
 * This is used internally to associate a class with its tag name, which is necessary for features like hydration and SSR support.
 * @param target The constructor of the custom element.
 * @param tagName The tag name to associate with the constructor.
 */
export function setCustomElementTagName(target: CustomElementConstructor, tagName: string): void {
	(target as CustomElementConstructorWithMetadata)[CUSTOM_ELEMENT_TAG_NAME] = tagName;
}
