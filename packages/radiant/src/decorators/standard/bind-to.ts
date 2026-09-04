import { applyBindToTargets, type BindToHost, type CompiledBindToTarget } from '../shared/bind-to';

export function bindTo(targets: readonly CompiledBindToTarget[]) {
	return function <THost extends BindToHost, TValue>(
		_field: undefined,
		context: ClassFieldDecoratorContext<THost, TValue>,
	): void {
		const propertyName = String(context.name);

		context.addInitializer(function (this: THost) {
			const apply = () => applyBindToTargets(this, propertyName, targets);
			this.registerUpdateCallback(propertyName, apply);
			this.registerPostSyncCallback(apply);
		});
	};
}
