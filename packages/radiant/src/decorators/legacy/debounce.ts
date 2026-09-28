import type { RadiantElement } from '../../core/radiant-element';
import { debounce as debounceFunction } from '../../helpers/debounce';

export function debounce(
	timeout: number,
): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	return (_target: RadiantElement, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor => {
		const originalMethod = descriptor.value;
		const debouncedByInstance = new WeakMap<object, ReturnType<typeof debounceFunction<typeof originalMethod>>>();

		descriptor.value = function debounce(this: object, ...args: Parameters<typeof originalMethod>) {
			let debounced = debouncedByInstance.get(this);

			if (!debounced) {
				debounced = debounceFunction((...innerArgs: Parameters<typeof originalMethod>) => {
					return originalMethod.apply(this, innerArgs);
				}, timeout);
				debouncedByInstance.set(this, debounced);
			}

			debounced(...args);
		};

		return descriptor;
	};
}
