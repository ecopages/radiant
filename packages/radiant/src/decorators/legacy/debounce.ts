import type { RadiantElement } from '../../core/radiant-element';
import { debounce as debounceFunction } from '../../helpers/debounce';
import type { Method } from '../../types';
import { bound } from './bound';

/**
 * @remarks Legacy decorators apply bottom-up, so a `@bound` below this one hands over its accessor descriptor. Read
 * on the prototype, that accessor returns the undecorated method, which is debounced here and then bound again, so
 * the result matches `@bound` above `@debounce`.
 */
export function debounce(
	timeout: number,
): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	return (target: RadiantElement, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor => {
		const originalMethod: Method = descriptor.value ?? descriptor.get?.call(target);
		const debouncedByInstance = new WeakMap<object, ReturnType<typeof debounceFunction<typeof originalMethod>>>();

		const value = function debounce(this: object, ...args: Parameters<typeof originalMethod>) {
			let debounced = debouncedByInstance.get(this);

			if (!debounced) {
				debounced = debounceFunction((...innerArgs: Parameters<typeof originalMethod>) => {
					return originalMethod.apply(this, innerArgs);
				}, timeout);
				debouncedByInstance.set(this, debounced);
			}

			debounced(...args);
		};

		if (descriptor.get) {
			return bound(target, propertyKey, { value });
		}

		descriptor.value = value;
		return descriptor;
	};
}
