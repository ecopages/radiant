import type { RadiantElement } from '../../core/radiant-element';
import { createQuerySlot } from '../../helpers/create-query-slot';
import { registerSsrPreparationCallback } from '../../core/ssr-preparation';
import type { QuerySlotConfig } from '../query-slot';
import { registerLegacyInstanceInitializer } from './instance-initializers';

type SlotQueryHost = RadiantElement & {
	getSlotElement<T extends Element = Element>(name?: string): T | null;
	getSlotElements<T extends Element = Element>(name?: string): T[];
	slotProjectionVersion?: number;
};

export function querySlot<T extends Element | Element[] | null>(
	options: QuerySlotConfig = {},
): (proto: RadiantElement, propertyName: string | symbol) => void {
	return (proto: RadiantElement, propertyKey: string | symbol) => {
		const hasDefinedInstanceQuery = (instance: SlotQueryHost) => {
			const descriptor = Object.getOwnPropertyDescriptor(instance, propertyKey);
			return typeof descriptor?.get === 'function';
		};

		const defineSlotQueryProperty = (instance: SlotQueryHost) => {
			if (hasDefinedInstanceQuery(instance)) {
				return;
			}

			const accessor = createQuerySlot<T>(instance, options);

			Object.defineProperty(instance, propertyKey, {
				get() {
					return accessor.value;
				},
				enumerable: true,
				configurable: true,
			});
		};

		const protoAccessorCache = new WeakMap<SlotQueryHost, ReturnType<typeof createQuerySlot<T>>>();

		Object.defineProperty(proto, propertyKey, {
			get(this: SlotQueryHost) {
				let accessor = protoAccessorCache.get(this);
				if (!accessor) {
					accessor = createQuerySlot<T>(this, options);
					protoAccessorCache.set(this, accessor);
				}
				return accessor.value;
			},
			enumerable: true,
			configurable: true,
		});

		registerLegacyInstanceInitializer(proto, (element) => {
			registerSsrPreparationCallback(element, () => {
				defineSlotQueryProperty(element as SlotQueryHost);
			});
			element.registerConnectedCallback(() => {
				defineSlotQueryProperty(element as SlotQueryHost);
			});
		});
	};
}
