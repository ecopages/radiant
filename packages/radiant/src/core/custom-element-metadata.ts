export const CUSTOM_ELEMENT_TAG_NAME = Symbol.for('@ecopages/radiant.customElementTagName');

type CustomElementConstructorWithMetadata = CustomElementConstructor & {
	[CUSTOM_ELEMENT_TAG_NAME]?: string;
};

export function setCustomElementTagName(target: CustomElementConstructor, tagName: string): void {
	(target as CustomElementConstructorWithMetadata)[CUSTOM_ELEMENT_TAG_NAME] = tagName;
}

export function getCustomElementTagName(target: CustomElementConstructor): string | undefined {
	return (target as CustomElementConstructorWithMetadata)[CUSTOM_ELEMENT_TAG_NAME];
}
