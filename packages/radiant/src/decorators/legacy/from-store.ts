import type { ExternalStoreSource, SignalOptions } from '@ecopages/signals';
import { HAS_PRE_UPGRADE_VALUE } from '../../core/pre-upgrade-value';
import type { ReactiveHostLike } from '../../core/reactive-host';
import { installFromStoreField } from '../shared/from-store';
import { warnInitializerOnStoreField } from '../shared/initializer-default-warning';
import { registerLegacyPostConstructionInitializer } from './instance-initializers';

export function fromStore<Snapshot, Selected>(
	store: ExternalStoreSource<Snapshot>,
	select?: (snapshot: Snapshot) => Selected,
	options?: SignalOptions<Selected>,
): (proto: ReactiveHostLike, propertyName: string | symbol) => void {
	return (proto: ReactiveHostLike, propertyKey: string | symbol) => {
		const propertyName = String(propertyKey);

		registerLegacyPostConstructionInitializer(proto, (element, phase) => {
			if (
				phase === 'constructed' &&
				Object.prototype.hasOwnProperty.call(element, propertyName) &&
				!element[HAS_PRE_UPGRADE_VALUE]?.(propertyName)
			) {
				warnInitializerOnStoreField(
					element,
					propertyName,
					(element as unknown as Record<string, unknown>)[propertyName],
					element.constructor,
				);
			}

			installFromStoreField(element, propertyName, store, select, options);
		});
	};
}
