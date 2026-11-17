import type { ExternalStoreSource, SignalOptions } from '@ecopages/signals';
import type { ReactiveHostLike } from '../../core/reactive-host';
import { installFromStoreField } from '../shared/from-store';
import { warnInitializerOnStoreField } from '../shared/initializer-default-warning';

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

		return function (this: THost, initializerValue: Selected): Selected {
			warnInitializerOnStoreField(this, propertyName, initializerValue, context.metadata);
			return initializerValue;
		};
	};
}
