declare const customElementTagNameType: unique symbol;

/**
 * Shared metadata key used across package boundaries to associate a custom-element constructor with its tag name.
 *
 * @remarks The registry string stays stable so mixed package versions can exchange this metadata.
 */
export const CUSTOM_ELEMENT_TAG_NAME: typeof customElementTagNameType = Symbol.for(
	'@ecopages/radiant.customElementTagName',
) as typeof customElementTagNameType;

type CustomElementConstructorWithTagName = CustomElementConstructor & {
	[CUSTOM_ELEMENT_TAG_NAME]?: string;
};

/**
 * Reads the tag stored under {@link CUSTOM_ELEMENT_TAG_NAME} by `@customElement(...)`.
 *
 * @remarks Does not consult `customElements.getName()`; JSX resolution falls back to it.
 */
export function getCustomElementTagName(constructor: CustomElementConstructor): string | undefined {
	return (constructor as CustomElementConstructorWithTagName)[CUSTOM_ELEMENT_TAG_NAME];
}
