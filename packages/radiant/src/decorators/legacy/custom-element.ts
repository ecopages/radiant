import {
	assertAutonomousCustomElementOptions,
	type AutonomousCustomElementOptions,
} from '../assert-autonomous-custom-element-options';
import { setCustomElementTagName } from '../../core/custom-element-metadata';
import { setHostAttributes } from '../../core/host-attributes';
import { applyObservedAttributesFromPropRegistry } from '../../core/reactive-prop-metadata';
import { ensureLegacyHostReady } from './host-readiness';

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

		if (typeof customElements === 'undefined') {
			return decorated;
		}

		const target = withLegacyConstructionEnd(decorated);
		setCustomElementTagName(target, name);
		setHostAttributes(target, options?.hostAttributes);

		if (!customElements.get(name)) {
			customElements.define(name, target, options);
		}

		return target;
	};
}

/**
 * Subclasses a decorated class so legacy post-construction setup runs when its constructor has finished.
 *
 * @remarks
 * Legacy property decorators see only the prototype, and `useDefineForClassFields` defines each field as an own
 * data property after `super()` returns. A write made right after `new` is then indistinguishable from a field
 * initializer until the reactive accessors replace those data properties. Installing them here, at the end of the
 * most derived constructor and before any caller code runs, matches the standard decorators, which set each member
 * up as its field initializes: a later write goes through the accessor and is recorded as explicit, so it wins over
 * an authored attribute at the first connect. Classes registered without this decorator keep the connect-time
 * setup.
 */
function withLegacyConstructionEnd<T extends CustomElementConstructor>(decorated: T): T {
	const Constructed = class extends (decorated as CustomElementConstructor) {
		constructor(...args: unknown[]) {
			super(...(args as []));
			ensureLegacyHostReady(this, 'connect');
		}
	};

	Object.defineProperty(Constructed, 'name', { value: decorated.name, configurable: true });
	return Constructed as T;
}
