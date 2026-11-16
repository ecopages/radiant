import type { ReactiveHostLike } from '../../core/reactive-host';
import { warnDiscardedPreUpgradeValue } from '../shared/pre-upgrade-warning';
import { registerLegacyInstanceInitializer, registerLegacyPostConstructionInitializer } from './instance-initializers';
import { bootstrapReactiveMember } from './member-bootstrap';

export function reactiveField(target: ReactiveHostLike, propertyKey: string) {
	registerLegacyInstanceInitializer(target, (element) => {
		warnDiscardedPreUpgradeValue(element, propertyKey, '@state');
		bootstrapReactiveMember(element, propertyKey, element[propertyKey as keyof typeof element]);
	});

	registerLegacyPostConstructionInitializer(target, (element) => {
		element.createReactiveField(propertyKey, element[propertyKey as keyof typeof element], {
			suppressInitialNotify: true,
		});
	});
}
