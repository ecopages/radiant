import type { QueryConfig } from '../query';
import { installQueryField, type QueryDecoratorHost } from '../shared/query';

export function query(options: QueryConfig) {
	return function <T extends QueryDecoratorHost, V extends Element | Element[] | null>(
		target: undefined,
		context: ClassFieldDecoratorContext<T, V>,
	) {
		void target;
		const propertyName = String(context.name);

		context.addInitializer(function (this: T) {
			installQueryField(this, propertyName, options);
		});
	};
}
