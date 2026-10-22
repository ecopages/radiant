import type { QuerySlotConfig } from '../helpers/create-query-slot';
import type { RadiantElement } from '../core/radiant-element';
import { querySlot as legacyQuerySlot } from './legacy/query-slot';
import { querySlot as standardQuerySlot } from './standard/query-slot';
import { fieldDecorator, type ValueFieldDecorator } from './bridge';

export type { QuerySlotConfig };

/**
 * Queries projected light-DOM content assigned to a RadiantElement slot.
 *
 * The decorator returns assigned elements from the default slot when `name` is
 * omitted, or from the named slot when `name` is provided. Results are cached
 * by default and automatically invalidated when slot projection changes.
 *
 * The type argument is the element type. Under standard decorators the field
 * is `T | null`, or `T[]` with `all: true`, and a field of another type is
 * rejected.
 *
 * @remarks
 * A value decorator, not a bounded one, like `@query`: a single-element query returns `null` when
 * nothing is assigned, and a bound can allow `null` but cannot require it. `all` picks the overload,
 * so it must be a literal.
 */
export function querySlot<T extends Element = Element>(
	options: QuerySlotConfig & { all: true },
): ValueFieldDecorator<RadiantElement, T[]>;
export function querySlot<T extends Element = Element>(
	options?: QuerySlotConfig & { all?: false },
): ValueFieldDecorator<RadiantElement, T | null>;
export function querySlot<Value extends Element[] | Element | null>(
	options: QuerySlotConfig = {},
): ValueFieldDecorator<RadiantElement, Value> {
	return fieldDecorator<RadiantElement, Value>(standardQuerySlot(options), legacyQuerySlot(options));
}
