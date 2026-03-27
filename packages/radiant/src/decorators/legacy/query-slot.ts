import type { RadiantElement } from '../../core/radiant-element';
import type { QuerySlotConfig } from '../query-slot';

type SlotQueryHost = RadiantElement & {
	getSlotElement<T extends Element = Element>(name?: string): T | null;
	getSlotElements<T extends Element = Element>(name?: string): T[];
	slotProjectionVersion?: number;
};

type SlotQueryCacheHost = SlotQueryHost & Record<symbol, unknown>;

export function querySlot<T extends Element | Element[]>({
	cache: shouldCache = true,
	...options
}: QuerySlotConfig = {}): (proto: RadiantElement, propertyName: string | symbol) => void {
	return (proto: RadiantElement, propertyKey: string | symbol) => {
		const privateCacheKey = Symbol(`__${String(propertyKey)}__slot_cache`);
		const privateVersionKey = Symbol(`__${String(propertyKey)}__slot_version`);
		const hasDefinedInstanceQuery = (instance: SlotQueryHost) => {
			const descriptor = Object.getOwnPropertyDescriptor(instance, propertyKey);
			return typeof descriptor?.get === 'function';
		};

		const executeQuery = (instance: SlotQueryHost) => {
			if (options.all) {
				return (
					typeof instance.getSlotElements === 'function' ? instance.getSlotElements(options.name) : []
				) as T;
			}

			return (typeof instance.getSlotElement === 'function' ? instance.getSlotElement(options.name) : null) as T;
		};

		const defineSlotQueryProperty = (instance: SlotQueryHost) => {
			if (hasDefinedInstanceQuery(instance)) {
				return;
			}

			Object.defineProperty(instance, propertyKey, {
				get() {
					return readSlotQueryValue(instance);
				},
				enumerable: true,
				configurable: true,
			});
		};

		const readSlotQueryValue = (instance: SlotQueryHost): T => {
			const cacheHost = instance as SlotQueryCacheHost;

			if (!shouldCache) {
				return executeQuery(instance);
			}

			const currentVersion = instance.slotProjectionVersion ?? 0;

			if (cacheHost[privateVersionKey] !== currentVersion) {
				cacheHost[privateCacheKey] = executeQuery(instance);
				cacheHost[privateVersionKey] = currentVersion;
			}

			return cacheHost[privateCacheKey] as T;
		};

		Object.defineProperty(proto, propertyKey, {
			get(this: SlotQueryHost) {
				return readSlotQueryValue(this);
			},
			enumerable: true,
			configurable: true,
		});

		const originalConnectedCallback = proto.connectedCallback;
		const originalRender = (proto as SlotQueryHost & { render?: (...args: unknown[]) => unknown }).render;

		proto.connectedCallback = function (this: SlotQueryHost) {
			defineSlotQueryProperty(this);
			originalConnectedCallback.call(this);
		};

		if (typeof originalRender === 'function') {
			(proto as SlotQueryHost & { render: (...args: unknown[]) => unknown }).render = function (
				this: SlotQueryHost,
				...args: unknown[]
			) {
				defineSlotQueryProperty(this);
				return originalRender.apply(this, args);
			};
		}
	};
}
