/**
 * Registers a web component with the given name on the global `window.customElements` registry.
 * @param name selector name.
 * @param options {@link ElementDefinitionOptions}
 */
export function customElement(name: string, options?: ElementDefinitionOptions) {
	return (target: CustomElementConstructor) => {
		if (!window.customElements.get(name)) {
			window.customElements.define(name, target, options);
		}
	};
}
