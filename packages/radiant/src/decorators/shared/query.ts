import { createQuery, createQueryAll, type QueryHostTarget } from '../../helpers/create-query';

export type QueryDecoratorHost = QueryHostTarget;

/**
 * Installs the live `@query` or `@queryAll` getter on a host.
 *
 * @remarks
 * Standard adapters run this from `addInitializer`, after class fields. Legacy adapters run it from
 * post-construction so `useDefineForClassFields` does not overwrite the getter with `undefined`.
 */
export function installQueryField(
	host: QueryHostTarget,
	propertyName: string | symbol,
	selector: string,
	all: boolean,
): void {
	const accessor = all ? createQueryAll(host, selector) : createQuery(host, selector);

	Object.defineProperty(host, propertyName, {
		get() {
			return accessor.value;
		},
		enumerable: true,
		configurable: true,
	});
}
