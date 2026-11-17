import { fromExternalStore, type ExternalStoreSource, type SignalOptions } from '@ecopages/signals';
import { REACTIVE_HOST, type ReactiveHostLike } from '../../core/reactive-host';
import { warnDiscardedPreUpgradeValue } from './pre-upgrade-warning';

/**
 * Registers `fromExternalStore(...)` as a host member and installs a read-only field getter.
 *
 * @remarks
 * Standard adapters run this from `addInitializer`, after class fields. Legacy adapters run it from
 * post-construction so `useDefineForClassFields` does not overwrite the getter with `undefined`.
 */
export function installFromStoreField<Snapshot, Selected>(
	host: ReactiveHostLike,
	propertyName: string,
	store: ExternalStoreSource<Snapshot>,
	select?: (snapshot: Snapshot) => Selected,
	options?: SignalOptions<Selected>,
): void {
	warnDiscardedPreUpgradeValue(host, propertyName, '@fromStore');
	host.registerReactiveMember(propertyName, fromExternalStore(store, select, options));
	host[REACTIVE_HOST].defineReadonlyReactiveAccessor(propertyName);
}
