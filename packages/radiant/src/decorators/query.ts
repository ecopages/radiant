import type { QueryConfig } from '../helpers/create-query';
import { query as legacyQuery } from './legacy/query';
import { query as standardQuery } from './standard/query';
import { fieldDecorator, type ValueFieldDecorator } from './bridge';
import type { QueryDecoratorHost } from './shared/query';

export type { QueryDecoratorHost };

export type { QueryConfig };

/**
 * A decorator to query by CSS selector or data-ref attribute. A `ref` lookup only finds parts the host owns,
 * a nested host's same-named part is skipped; `selector` is unscoped.
 * `@query(selector)` returns the first match or `null`, read live on every access. The options object is the
 * older form: it can query for all elements with `all: true`, and it caches the result only when `cache` is enabled.
 *
 * The type argument is the element type. Under standard decorators the field is `T | null`, or `T[]` with
 * `all: true`, and a field of another type is rejected.
 *
 * @remarks
 * A value decorator, not a bounded one: a single-element query returns `null` when nothing matches,
 * and a bound can allow `null` but cannot require it. `all` picks the overload, so it must be a literal.
 * Unscoped: a query reaches into nested hosts.
 */
export function query<T extends Element = Element>(selector: string): ValueFieldDecorator<QueryDecoratorHost, T | null>;
export function query<T extends Element = Element>(
	options: QueryConfig & { all: true },
): ValueFieldDecorator<QueryDecoratorHost, T[]>;
export function query<T extends Element = Element>(
	options: QueryConfig & { all?: false },
): ValueFieldDecorator<QueryDecoratorHost, T | null>;
export function query<Value extends Element[] | Element | null>(
	options: QueryConfig | string,
): ValueFieldDecorator<QueryDecoratorHost, Value> {
	const config = typeof options === 'string' ? { selector: options } : options;
	return fieldDecorator<QueryDecoratorHost, Value>(standardQuery(config), legacyQuery(config));
}

/**
 * A decorator that reads every element matching `selector`, in document order, as an array on every access.
 * The field is `[]` when nothing matches, and under standard decorators it must be an array of elements.
 *
 * @remarks
 * Unscoped: matches inside nested hosts are included.
 */
export function queryAll<T extends Element = Element>(selector: string): ValueFieldDecorator<QueryDecoratorHost, T[]> {
	const config = { selector, all: true };
	return fieldDecorator<QueryDecoratorHost, T[]>(standardQuery(config), legacyQuery(config));
}
