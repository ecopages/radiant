import { createQuery, type QueryConfig, type QueryHostTarget } from '../../helpers/create-query';

export type QueryDecoratorHost = QueryHostTarget;

/**
 * Installs the live `@query` getter on a host.
 *
 * @remarks
 * Standard adapters run this from `addInitializer`, after class fields. Legacy adapters run it from
 * post-construction so `useDefineForClassFields` does not overwrite the getter with `undefined`.
 */
export function installQueryField(host: QueryHostTarget, propertyName: string | symbol, options: QueryConfig): void {
	const accessor = createQuery(host, options);

	Object.defineProperty(host, propertyName, {
		get() {
			return accessor.value;
		},
		enumerable: true,
		configurable: true,
	});
}
