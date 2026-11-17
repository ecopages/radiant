import { fromExternalStore, type ExternalStoreSource } from '@ecopages/signals';
import { REACTIVE_HOST, type ReactiveHostLike } from '../../core/reactive-host';
import { warnDiscardedPreUpgradeValue } from './pre-upgrade-warning';

/** Optional comparison for the selected slice; defaults to `Object.is`. */
export type FromStoreOptions<Selected> = {
	equals?: (previous: Selected, next: Selected) => boolean;
};

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
	options?: FromStoreOptions<Selected>,
): void {
	warnDiscardedPreUpgradeValue(host, propertyName, '@fromStore');
	host.registerReactiveMember(propertyName, fromExternalStore(store, select, options));
	host[REACTIVE_HOST].defineReadonlyReactiveAccessor(propertyName);
}
