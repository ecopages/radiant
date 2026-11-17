import { installRefField, type RefDecoratorHost, type RefFieldConfig } from '../shared/ref';

export function ref(config: RefFieldConfig) {
	return function <T extends RefDecoratorHost, V extends Element | Element[] | null>(
		target: undefined,
		context: ClassFieldDecoratorContext<T, V>,
	) {
		void target;
		const propertyName = String(context.name);

		if (context.private) {
			throw new TypeError(
				`@${config.all ? 'refAll' : 'ref'} cannot decorate the private field ${propertyName}: a getter cannot be installed on a # field. Use a TypeScript private field.`,
			);
		}

		context.addInitializer(function (this: T) {
			installRefField(this, propertyName, config);
		});
	};
}
