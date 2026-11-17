import type { ExternalStoreSource, SignalOptions } from '@ecopages/signals';
import type { ReactiveHostLike } from '../core/reactive-host';
import { fieldDecorator, type ValueFieldDecorator } from './bridge';
import { fromStore as legacyFromStore } from './legacy/from-store';
import { fromStore as standardFromStore } from './standard/from-store';

/**
 * Declares a read-only host field over a Zustand, Redux, or `useSyncExternalStore` store.
 *
 * The field holds the selected slice. `{this.$.count}` patches that node. Assignment throws:
 * writes stay on the store (`setState`, `dispatch`, or the store's actions).
 *
 * @remarks
 * Same arguments as `fromExternalStore(store, select?, options?)`. The host subscribes while connected on the
 * client, `this.$` bindings included. Server rendering reads `getServerSnapshot()` when the store has one, and never
 * subscribes. When the store arrives through context, register `fromExternalStore(...)` in `@onContextUpdate`
 * instead: a field decorator cannot see a store that is not known at class definition.
 *
 * The declared field type is the selected value, and is the type `@bindTo` passes to `map`. Under
 * standard decorators a field that cannot hold that value is rejected. Legacy decorators never see
 * the field type.
 *
 * `@fromStore` is internal, not public input: a value assigned to the host before upgrade is
 * discarded in favour of the store snapshot, and development builds warn once per tag and member.
 *
 * @see `warnDiscardedPreUpgradeValue` in `shared/pre-upgrade-warning.ts` for the warning and an example.
 */
export function fromStore<Snapshot, Selected = Snapshot>(
	store: ExternalStoreSource<Snapshot>,
	select?: (snapshot: Snapshot) => Selected,
	options?: SignalOptions<NoInfer<Selected>>,
): ValueFieldDecorator<ReactiveHostLike, NoInfer<Selected>> {
	return fieldDecorator(standardFromStore(store, select, options), legacyFromStore(store, select, options));
}
