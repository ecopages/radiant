import type { ReactiveHostLike } from '../../core/reactive-host';
import { registerLegacyInstanceInitializer, registerLegacyPostConstructionInitializer } from './instance-initializers';

/**
 * A decorator to define a reactive field.
 * Every time the property changes, the `updated` method will be called.
 * Due the fact the value is always undefined before the first update,
 * we are adding a `isDefined` WeakSet to track if the property has been defined.
 * @param target The target element.
 * @param propertyKey The property key.
 */
export function reactiveField(target: ReactiveHostLike, propertyKey: string) {
	registerLegacyInstanceInitializer(target, (element) => {
		if (element.getReactiveMember(propertyKey)) {
			return;
		}

		element.createReactiveMember(propertyKey, element[propertyKey as keyof typeof element]);

		const bind =
			(
				element as unknown as { shouldAutoBindReactiveMembers?: () => boolean }
			).shouldAutoBindReactiveMembers?.() ?? false;

		if (bind) {
			element.defineReactiveBinding(propertyKey, bind);
		}
	});

	registerLegacyPostConstructionInitializer(target, (element, _phase) => {
		element.createReactiveField(propertyKey, element[propertyKey as keyof typeof element], {
			bind:
				(
					element as unknown as { shouldAutoBindReactiveMembers?: () => boolean }
				).shouldAutoBindReactiveMembers?.() ?? false,
		});
	});
}
