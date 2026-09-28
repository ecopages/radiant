import type { QuerySlotConfig } from '../helpers/create-query-slot';
import type { RadiantElement } from '../core/radiant-element';
import { querySlot as legacyQuerySlot } from './legacy/query-slot';
import { querySlot as standardQuerySlot } from './standard/query-slot';
import { fieldDecoratorBridge } from './bridge';

export type { QuerySlotConfig };

type QuerySlotDecorator<T extends Element | Element[] | null> = {
	(protoOrTarget: undefined, nameOrContext: ClassFieldDecoratorContext<any, T>): void;
	(protoOrTarget: RadiantElement, nameOrContext: string): void;
};

/**
 * Queries projected light-DOM content assigned to a RadiantElement slot.
 *
 * The decorator returns assigned elements from the default slot when `name` is
 * omitted, or from the named slot when `name` is provided. Results are cached
 * by default and automatically invalidated when slot projection changes.
 *
 * @param options Slot query options.
 */
export function querySlot<T extends Element | Element[] | null>(options: QuerySlotConfig = {}): QuerySlotDecorator<T> {
	function decorator(protoOrTarget: undefined, nameOrContext: ClassFieldDecoratorContext<any, T>): void;
	function decorator(protoOrTarget: RadiantElement, nameOrContext: string): void;
	function decorator(
		protoOrTarget: RadiantElement | undefined,
		nameOrContext: string | ClassFieldDecoratorContext<any, T>,
	): void {
		return fieldDecoratorBridge(
			standardQuerySlot(options) as (target: undefined, context: ClassFieldDecoratorContext<any, T>) => void,
			legacyQuerySlot<T>(options),
			protoOrTarget,
			nameOrContext,
		);
	}

	return decorator;
}
