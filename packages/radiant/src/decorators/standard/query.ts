import { createQuery } from '../../helpers/create-query';
import type { QueryConfig } from '../query';

export function query(options: QueryConfig) {
	return function <T extends HTMLElement, V extends Element | Element[]>(
		_: undefined,
		context: ClassFieldDecoratorContext<T, V>,
	) {
		const propertyName = String(context.name);

		context.addInitializer(function (this: T) {
			const accessor = createQuery<V>(this, options);

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
