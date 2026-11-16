import type { ReactiveHostLike } from '../../core/reactive-host';
import { warnDiscardedPreUpgradeValue } from '../shared/pre-upgrade-warning';

export function reactiveField<T extends ReactiveHostLike, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) {
	const contextName = String(context.name);
	const initializerValueKey = Symbol(`@ecopages/radiant/state:${contextName}:initializer`);

	context.addInitializer(function (this: T) {
		warnDiscardedPreUpgradeValue(this, contextName, '@state');
		const initializerValue = (this as Record<PropertyKey, V | undefined>)[initializerValueKey];
		this.createReactiveField(contextName, initializerValue as V, {
			suppressInitialNotify: true,
		});
	});

	return function (this: T, value: V) {
		(this as Record<PropertyKey, V | undefined>)[initializerValueKey] = value;
		return value;
	};
}
