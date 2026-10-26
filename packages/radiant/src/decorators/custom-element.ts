import type { AutonomousCustomElementOptions } from './assert-autonomous-custom-element-options';
import { customElement as legacyCustomElement } from './legacy/custom-element';
import { customElement as standardCustomElement } from './standard/custom-element';

/**
 * Registers a web component with the given name on the global `window.customElements` registry.
 * @param name selector name.
 * @param options options for defining an autonomous custom element.
 * @remarks Customized built-ins are not supported. Passing a defined `extends` value at runtime throws a `TypeError`; use an autonomous custom element instead.
 */
export function customElement(name: string, options?: AutonomousCustomElementOptions) {
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
