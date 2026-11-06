/** Fixed attributes a host gets when its author did not write them, declared with `@customElement`. */
export type HostAttributes = Readonly<Record<string, string>>;

const HOST_ATTRIBUTES = Symbol.for('@ecopages/radiant.host-attributes');

type ConstructorWithHostAttributes = CustomElementConstructor & {
	[HOST_ATTRIBUTES]?: HostAttributes;
};

/**
 * Stores the host attributes a `@customElement` class declares, merged over the ones it inherits.
 *
 * @remarks The merged record is an own static property, so a subclass without `hostAttributes` still reads its
 * base class's record through the constructor prototype chain.
 */
export function setHostAttributes(target: ConstructorWithHostAttributes, attributes: HostAttributes | undefined): void {
	if (attributes) {
		target[HOST_ATTRIBUTES] = { ...target[HOST_ATTRIBUTES], ...attributes };
	}
}

/** Writes each declared host attribute the element does not already have. */
export function applyHostAttributes(element: Element): void {
	const attributes = (element.constructor as ConstructorWithHostAttributes)[HOST_ATTRIBUTES] ?? {};

	for (const name in attributes) {
		if (!element.hasAttribute(name)) {
			element.setAttribute(name, attributes[name]);
		}
	}
}
