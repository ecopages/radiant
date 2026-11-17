import type { ExternalStoreSource, SignalOptions } from '@ecopages/signals';
import type { ReactiveHostLike } from '../../core/reactive-host';
import { installFromStoreField } from '../shared/from-store';

export function fromStore<Snapshot, Selected>(
	store: ExternalStoreSource<Snapshot>,
	select?: (snapshot: Snapshot) => Selected,
	options?: SignalOptions<Selected>,
) {
	return function <THost extends ReactiveHostLike>(
		_: undefined,
		context: ClassFieldDecoratorContext<THost, Selected>,
	) {
		const propertyName = String(context.name);

		context.addInitializer(function (this: THost) {
			installFromStoreField(this, propertyName, store, select, options);
		});
	};
}
