import type { QueryConfig } from '../helpers/create-query';
import { query as legacyQuery, type QueryDecoratorHost } from './legacy/query';
import { query as standardQuery } from './standard/query';
import { fieldDecorator, type ValueFieldDecorator } from './bridge';

export type { QueryConfig };

/**
 * A decorator to query by CSS selector or data-ref attribute.
 * By default it queries for the first element that matches the selector, but it can be configured to query for all elements.
 * It caches the result only when `cache` is enabled, in both decorator modes.
 *
 * The type argument is the element type. Under standard decorators the field is `T | null`, or `T[]` with
 * `all: true`, and a field of another type is rejected.
 *
 * @remarks
 * A value decorator, not a bounded one: a single-element query returns `null` when nothing matches,
 * and a bound can allow `null` but cannot require it. `all` picks the overload, so it must be a literal.
 */
export function query<T extends Element = Element>(
	options: QueryConfig & { all: true },
): ValueFieldDecorator<QueryDecoratorHost, T[]>;
export function query<T extends Element = Element>(
	options: QueryConfig & { all?: false },
): ValueFieldDecorator<QueryDecoratorHost, T | null>;
export function query<Value extends Element[] | Element | null>(
	options: QueryConfig,
): ValueFieldDecorator<QueryDecoratorHost, Value> {
	return fieldDecorator<QueryDecoratorHost, Value>(standardQuery(options), legacyQuery(options));
}
