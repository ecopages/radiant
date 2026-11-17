import { installQueryField, type QueryDecoratorHost } from '../shared/query';

export function query(selector: string, all: boolean) {
	return function <T extends QueryDecoratorHost, V extends Element | Element[] | null>(
		target: undefined,
		context: ClassFieldDecoratorContext<T, V>,
	) {
		void target;
		const propertyName = String(context.name);

		context.addInitializer(function (this: T) {
			installQueryField(this, propertyName, selector, all);
		});
	};
}
