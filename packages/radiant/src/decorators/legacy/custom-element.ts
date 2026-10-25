import {
	assertAutonomousCustomElementOptions,
	type AutonomousCustomElementOptions,
} from '../assert-autonomous-custom-element-options';
import { setCustomElementTagName } from '../../core/custom-element-metadata';
import { applyObservedAttributesFromPropRegistry } from '../../core/reactive-prop-metadata';

/**
 * Registers a web component with the given name on the global `window.customElements` registry.
 * @param name selector name.
 * @param options options for defining an autonomous custom element.
 */
export function customElement(name: string, options?: AutonomousCustomElementOptions) {
	assertAutonomousCustomElementOptions(options);

	return (target: CustomElementConstructor) => {
		setCustomElementTagName(target, name);

		applyObservedAttributesFromPropRegistry(target);

		if (typeof customElements !== 'undefined' && !customElements.get(name)) {
			customElements.define(name, target, options);
		}
	};
}
