import type { RadiantElement } from '../../core/radiant-element';
import { debounce as debounceFunction, type DebouncedFunction } from '../../helpers/debounce';
import type { Method } from '../../types';

/**
 * @remarks Legacy decorators apply bottom-up, so a `@bound` below this one hands over an accessor descriptor with
 * no `value`. The result is then an accessor too, returning one debounced wrapper per instance around the bound
 * method, so the debounced method stays bound.
 */
export function debounce(
	timeout: number,
): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	return (_target: RadiantElement, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor => {
		const { value, get } = descriptor as { value?: Method; get: () => Method };
		const debouncedByInstance = new WeakMap<object, DebouncedFunction<Method>>();
		const forInstance = (instance: object): DebouncedFunction<Method> => {
			let debounced = debouncedByInstance.get(instance);

			if (!debounced) {
				debounced = debounceFunction(value ? value.bind(instance) : get.call(instance), timeout);
				debouncedByInstance.set(instance, debounced);
			}

			return debounced;
		};

		if (value) {
			descriptor.value = function debounce(this: object, ...args: unknown[]) {
				forInstance(this)(...args);
			};
			return descriptor;
		}

		return {
			configurable: descriptor.configurable,
			enumerable: descriptor.enumerable,
			get(this: object) {
				return forInstance(this);
			},
		};
	};
}
