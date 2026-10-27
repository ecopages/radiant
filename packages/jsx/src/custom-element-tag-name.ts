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
 * Resolves a custom-element constructor's tag: the one `@customElement(...)` stored under
 * {@link CUSTOM_ELEMENT_TAG_NAME}, else the name it is registered under in `customElements`.
 *
 * @remarks Reads the metadata as an own property only. A subclass inherits static properties, so an inherited read
 * would give a subclass defined with `customElements.define()` its parent's tag. The registry fallback works on the
 * server too, through the SSR shim's `getName()`.
 */
export function getCustomElementTagName(constructor: CustomElementConstructor): string | undefined {
	if (Object.hasOwn(constructor, CUSTOM_ELEMENT_TAG_NAME)) {
		return (constructor as CustomElementConstructorWithTagName)[CUSTOM_ELEMENT_TAG_NAME];
	}

	return globalThis.customElements?.getName?.(constructor) ?? undefined;
}
