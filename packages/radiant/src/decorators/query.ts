import { query as legacyQuery } from './legacy/query';
import { query as standardQuery } from './standard/query';
import { fieldDecorator, type ValueFieldDecorator } from './bridge';
import type { QueryDecoratorHost } from './shared/query';

export type { QueryDecoratorHost };

/**
 * A decorator that reads the first element matching a CSS selector, or `null`, live on every access.
 *
 * The type argument is the element type. Under standard decorators the field must be `T | null`, and a
 * field of another type is rejected.
 *
 * @remarks
 * A value decorator, not a bounded one: a query returns `null` when nothing matches, and a bound can
 * allow `null` but cannot require it. Unscoped: a query reaches into nested hosts, so a selector can find
 * an element another host owns. Use `@ref` for the parts this host owns.
 */
export function query<T extends Element = Element>(
	selector: string,
): ValueFieldDecorator<QueryDecoratorHost, T | null> {
	return fieldDecorator<QueryDecoratorHost, T | null>(standardQuery(selector, false), legacyQuery(selector, false));
}

/**
 * A decorator that reads every element matching `selector`, in document order, as an array on every access.
 * The field is `[]` when nothing matches, and under standard decorators it must be an array of elements.
 *
 * @remarks
 * Unscoped: matches inside nested hosts are included.
 */
export function queryAll<T extends Element = Element>(selector: string): ValueFieldDecorator<QueryDecoratorHost, T[]> {
	return fieldDecorator<QueryDecoratorHost, T[]>(standardQuery(selector, true), legacyQuery(selector, true));
}
