import { customElement as legacyCustomElement } from './legacy/custom-element';
import { customElement as standardCustomElement } from './standard/custom-element';

/**
 * Registers a web component with the given name on the global `window.customElements` registry.
 * @param name selector name.
 * @param options {@link ElementDefinitionOptions}
 */
export function customElement(name: string, options?: ElementDefinitionOptions) {
	function decorator<T extends CustomElementConstructor>(
		protoOrTarget: T,
		nameOrContext: ClassDecoratorContext<T>,
	): void;
	function decorator(protoOrTarget: CustomElementConstructor): void;
	function decorator(
		protoOrTarget: CustomElementConstructor,
		nameOrContext?: ClassDecoratorContext<CustomElementConstructor>,
	): void {
		if (typeof nameOrContext !== 'undefined') {
			return standardCustomElement(name, options)(protoOrTarget, nameOrContext);
		}

		return legacyCustomElement(name, options)(protoOrTarget);
	}

	return decorator;
}
