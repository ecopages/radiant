import type { StandardOrLegacyFieldDecoratorArgs } from '../types';
import type { QuerySlotConfig as HelperQuerySlotConfig } from '../helpers/create-query-slot';
import { querySlot as legacyQuerySlot } from './legacy/query-slot';
import { querySlot as standardQuerySlot } from './standard/query-slot';
import { fieldDecoratorBridge } from './bridge';

export type QuerySlotConfig = HelperQuerySlotConfig;

/**
 * Queries projected light-DOM content assigned to a RadiantComponent slot.
 *
 * The decorator returns assigned elements from the default slot when `name` is
 * omitted, or from the named slot when `name` is provided. Results are cached
 * by default and automatically invalidated when slot projection changes.
 *
 * @param options Slot query options.
 */
export function querySlot<T extends Element | Element[]>(options: QuerySlotConfig = {}) {
	return function (
		protoOrTarget: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'],
		nameOrContext: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
	): any {
		return fieldDecoratorBridge(
			standardQuerySlot(options),
			legacyQuerySlot<T>(options),
			protoOrTarget,
			nameOrContext,
		);
	};
}
