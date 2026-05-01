import type { QuerySlotConfig } from '../helpers/create-query-slot';
import type { RadiantElement } from '../core/radiant-element';
import { querySlot as legacyQuerySlot } from './legacy/query-slot';
import { querySlot as standardQuerySlot } from './standard/query-slot';
import { fieldDecoratorBridge } from './bridge';

export type { QuerySlotConfig };

type SlotQueryHost = HTMLElement & {
	getSlotElement<T extends Element = Element>(name?: string): T | null;
	getSlotElements<T extends Element = Element>(name?: string): T[];
	slotProjectionVersion?: number;
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
	function decorator<THost extends SlotQueryHost>(
		protoOrTarget: undefined,
		nameOrContext: ClassFieldDecoratorContext<THost, T>,
	): void;
	function decorator(protoOrTarget: RadiantElement, nameOrContext: string): void;
	function decorator(
		protoOrTarget: RadiantElement | undefined,
		nameOrContext: string | ClassFieldDecoratorContext<SlotQueryHost, T>,
	): void {
		return fieldDecoratorBridge(
			standardQuerySlot(options),
			legacyQuerySlot<T>(options),
			protoOrTarget,
			nameOrContext,
		);
	}

	return decorator;
}
