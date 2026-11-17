import type { ExternalStoreSource, SignalOptions } from '@ecopages/signals';
import type { ReactiveHostLike } from '../../core/reactive-host';
import { installFromStoreField } from '../shared/from-store';
import { registerLegacyPostConstructionInitializer } from './instance-initializers';

export function fromStore<Snapshot, Selected>(
	store: ExternalStoreSource<Snapshot>,
	select?: (snapshot: Snapshot) => Selected,
	options?: SignalOptions<Selected>,
): (proto: ReactiveHostLike, propertyName: string | symbol) => void {
	return (proto: ReactiveHostLike, propertyKey: string | symbol) => {
		registerLegacyPostConstructionInitializer(proto, (element) => {
			installFromStoreField(element, String(propertyKey), store, select, options);
		});
	};
}
