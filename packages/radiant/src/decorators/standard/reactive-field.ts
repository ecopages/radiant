import type { ReactiveHostLike } from '../../core/reactive-host';

export function reactiveField<T extends ReactiveHostLike, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) {
	const privatePropertyKey = Symbol(`__${String(context.name)}__value`);

	const contextName = String(context.name);

	context.addInitializer(function (this: T) {
		this.defineReactiveBinding(
			contextName,
			(this as unknown as { shouldAutoBindReactiveMembers?: () => boolean }).shouldAutoBindReactiveMembers?.() ??
				false,
		);
		this.registerReactiveDependencyReader(
			contextName,
			() => (this as unknown as Record<PropertyKey, unknown>)[privatePropertyKey],
		);

		Object.defineProperty(this, context.name, {
			get() {
				(this as ReactiveHostLike).trackReactiveRead(contextName);
				return (this as unknown as Record<PropertyKey, unknown>)[privatePropertyKey];
			},
			set(newValue: unknown) {
				const oldValue = (this as unknown as Record<PropertyKey, unknown>)[privatePropertyKey];
				if (oldValue !== newValue) {
					(this as unknown as Record<PropertyKey, unknown>)[privatePropertyKey] = newValue;
					(this as ReactiveHostLike).notifyUpdate(contextName, oldValue, newValue);
				}
			},
			enumerable: true,
			configurable: true,
		});
	});

	return function (this: T, value: V) {
		(this as any)[privatePropertyKey] = value;
		return value;
	};
}
