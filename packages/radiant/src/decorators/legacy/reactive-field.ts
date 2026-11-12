import type { ReactiveHostLike } from '../../core/reactive-host';
import { resolveHostAutoBind } from '../shared/auto-bind';
import { warnDiscardedPreUpgradeValue } from '../shared/pre-upgrade-warning';
import { registerLegacyInstanceInitializer, registerLegacyPostConstructionInitializer } from './instance-initializers';
import { bootstrapReactiveMemberBinding } from './member-bootstrap';

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
		warnDiscardedPreUpgradeValue(element, propertyKey, '@state');
		bootstrapReactiveMemberBinding(
			element,
			propertyKey,
			element[propertyKey as keyof typeof element],
			resolveHostAutoBind(element),
		);
	});

	registerLegacyPostConstructionInitializer(target, (element) => {
		element.createReactiveField(propertyKey, element[propertyKey as keyof typeof element], {
			bind: resolveHostAutoBind(element),
			suppressInitialNotify: true,
		});
	});
}
