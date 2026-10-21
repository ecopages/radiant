import type { QueryConfig } from '../helpers/create-query';
import { query as legacyQuery, type QueryDecoratorHost } from './legacy/query';
import { query as standardQuery } from './standard/query';
import { fieldDecorator, type ValueFieldDecorator } from './bridge';

export type { QueryConfig };

/**
 * A decorator to query by CSS selector or data-ref attribute.
 * By default it queries for the first element that matches the selector, but it can be configured to query for all elements.
 * It caches the result only when `cache` is enabled.
 * @param options {@link QueryConfig} The options for the reactive property.
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
