import type { QuerySlotConfig } from '../helpers/create-query-slot';
import type { RadiantElement } from '../core/radiant-element';
import { querySlot as legacyQuerySlot } from './legacy/query-slot';
import { querySlot as standardQuerySlot } from './standard/query-slot';
import { boundedFieldDecorator, type BoundedFieldDecorator } from './bridge';

export type { QuerySlotConfig };

/**
 * Queries projected light-DOM content assigned to a RadiantElement slot.
 *
 * The decorator returns assigned elements from the default slot when `name` is
 * omitted, or from the named slot when `name` is provided. Results are cached
 * by default and automatically invalidated when slot projection changes.
 *
 * @param options Slot query options.
 */
export function querySlot(
	options: QuerySlotConfig = {},
): BoundedFieldDecorator<RadiantElement, Element | Element[] | null> {
	return boundedFieldDecorator(standardQuerySlot(options), legacyQuerySlot(options));
}
