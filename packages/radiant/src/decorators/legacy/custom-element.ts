import {
	assertAutonomousCustomElementOptions,
	type AutonomousCustomElementOptions,
} from '../assert-autonomous-custom-element-options';
import { setCustomElementTagName } from '../../core/custom-element-metadata';
import { setHostAttributes } from '../../core/host-attributes';
import { applyObservedAttributesFromPropRegistry } from '../../core/reactive-prop-metadata';
import { withLegacyConstructionEnd } from './host-readiness';

/**
 * Registers a web component with the given name on the global `window.customElements` registry.
 * @param name selector name.
 * @param options options for defining an autonomous custom element.
 */
export function customElement(name: string, options?: AutonomousCustomElementOptions) {
	assertAutonomousCustomElementOptions(options);

	return <T extends CustomElementConstructor>(decorated: T): T => {
		setCustomElementTagName(decorated, name);
		setHostAttributes(decorated, options?.hostAttributes);
		applyObservedAttributesFromPropRegistry(decorated);

		const target = withLegacyConstructionEnd(decorated);
		setCustomElementTagName(target, name);
		setHostAttributes(target, options?.hostAttributes);

		if (typeof customElements !== 'undefined' && !customElements.get(name)) {
			customElements.define(name, target, options);
		}

		return target;
	};
}
