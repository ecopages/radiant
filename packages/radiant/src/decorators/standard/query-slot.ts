import type { QuerySlotConfig } from '../query-slot';

type SlotQueryHost = HTMLElement & {
	getSlotElement<T extends Element = Element>(name?: string): T | null;
	getSlotElements<T extends Element = Element>(name?: string): T[];
	slotProjectionVersion?: number;
};

export function querySlot(options: QuerySlotConfig = {}) {
	return function <T extends SlotQueryHost, V extends Element | Element[]>(
		_: undefined,
		context: ClassFieldDecoratorContext<T, V>,
	) {
		const propertyName = String(context.name);
		const privateCacheKey = Symbol(`__${propertyName}__slot_cache`);
		const privateVersionKey = Symbol(`__${propertyName}__slot_version`);

		const executeQuery = (instance: SlotQueryHost) => {
			if (options.all) {
				return (
					typeof instance.getSlotElements === 'function' ? instance.getSlotElements(options.name) : []
				) as V;
			}

			return (typeof instance.getSlotElement === 'function' ? instance.getSlotElement(options.name) : null) as V;
		};

		context.addInitializer(function (this: T) {
			Object.defineProperty(this, propertyName, {
				get() {
					if (options.cache === false) {
						return executeQuery(this) as V;
					}

					const currentVersion = this.slotProjectionVersion ?? 0;

					if (this[privateVersionKey] !== currentVersion) {
						this[privateCacheKey] = executeQuery(this);
						this[privateVersionKey] = currentVersion;
					}

					return this[privateCacheKey] as V;
				},
				enumerable: true,
				configurable: true,
			});
		});
	};
}
