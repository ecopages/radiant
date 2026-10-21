import { createQuery, type QueryHostTarget } from '../../helpers/create-query';
import type { QueryConfig } from '../query';

export function query(options: QueryConfig) {
	return function <T extends QueryHostTarget, V extends Element | Element[] | null>(
		target: undefined,
		context: ClassFieldDecoratorContext<T, V>,
	) {
		void target;
		const propertyName = String(context.name);

		context.addInitializer(function (this: T) {
			const accessor = createQuery(this, options);

			Object.defineProperty(this, propertyName, {
				get() {
					return accessor.value;
				},
				enumerable: true,
				configurable: true,
			});
		});
	};
}
