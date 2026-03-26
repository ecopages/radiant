import type {
	LegacyFieldDecoratorArgs,
	StandardFieldDecoratorArgs,
	StandardOrLegacyFieldDecoratorArgs,
} from '../types';
import { querySlot as legacyQuerySlot } from './legacy/query-slot';
import { querySlot as standardQuerySlot } from './standard/query-slot';

export type QuerySlotConfig = {
	all?: boolean;
	cache?: boolean;
	name?: string;
};

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
		if (typeof nameOrContext === 'object') {
			return standardQuerySlot(options)(
				protoOrTarget as StandardFieldDecoratorArgs['protoOrTarget'],
				nameOrContext as StandardFieldDecoratorArgs<HTMLElement, Element | Element[]>['nameOrContext'],
			);
		}

		return legacyQuerySlot<T>(options)(
			protoOrTarget as LegacyFieldDecoratorArgs['protoOrTarget'],
			nameOrContext as LegacyFieldDecoratorArgs['nameOrContext'],
		);
	};
}
