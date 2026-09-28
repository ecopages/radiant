import { createQuerySlot } from '../../helpers/create-query-slot';
import type { QuerySlotConfig } from '../query-slot';

type SlotQueryHost = HTMLElement & {
	getSlotElements<T extends Element = Element>(name?: string): T[];
	slotProjectionVersion?: number;
};

export function querySlot(options: QuerySlotConfig = {}) {
	return function <T extends SlotQueryHost, V extends Element | Element[] | null>(
		target: undefined,
		context: ClassFieldDecoratorContext<T, V>,
	) {
		void target;
		const propertyName = String(context.name);

		context.addInitializer(function (this: T) {
			const accessor = createQuerySlot<V>(this, options);

			Object.defineProperty(this, propertyName, {
				get() {
					return accessor.value;
				},
				enumerable: true,
				configurable: true,
			});
		});
	};
}
