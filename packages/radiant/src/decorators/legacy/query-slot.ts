import type { RadiantElement } from '../../core/radiant-element';
import { createQuerySlot } from '../../helpers/create-query-slot';
import { registerSsrPreparationCallback } from '../../core/ssr-preparation';
import type { QuerySlotConfig } from '../query-slot';
import { registerLegacyInstanceInitializer } from './instance-initializers';

type SlotQueryHost = RadiantElement & {
	getSlotElements<T extends Element = Element>(name?: string): T[];
	slotProjectionVersion?: number;
};

export function querySlot(
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

			const accessor = createQuerySlot(instance, options);

			Object.defineProperty(instance, propertyKey, {
				get() {
					return accessor.value;
				},
				enumerable: true,
				configurable: true,
			});
		};

		const protoAccessorCache = new WeakMap<SlotQueryHost, ReturnType<typeof createQuerySlot>>();

		Object.defineProperty(proto, propertyKey, {
			get(this: SlotQueryHost) {
				let accessor = protoAccessorCache.get(this);
				if (!accessor) {
					accessor = createQuerySlot(this, options);
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
