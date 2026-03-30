import type { RadiantElement } from '../../core/radiant-element';
import { registerLegacyInstanceInitializer } from './instance-initializers';

/**
 * A decorator to define a reactive field.
 * Every time the property changes, the `updated` method will be called.
 * Due the fact the value is always undefined before the first update,
 * we are adding a `isDefined` WeakSet to track if the property has been defined.
 * @param target The target element.
 * @param propertyKey The property key.
 */
export function reactiveField(target: RadiantElement, propertyKey: string) {
	registerLegacyInstanceInitializer(target, (element) => {
		element.registerConnectedCallback(() => {
			element.createReactiveField(propertyKey, element[propertyKey as keyof typeof element], {
				bind:
					(
						element as unknown as { shouldAutoBindReactiveMembers?: () => boolean }
					).shouldAutoBindReactiveMembers?.() ?? false,
			});
		});
	});
}
