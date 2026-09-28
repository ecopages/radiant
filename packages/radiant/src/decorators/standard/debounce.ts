import { debounce as debounceFunction } from '../../helpers/debounce';
import type { Method } from '../../types';

export function debounce(timeout: number): Method {
	return <T extends Method>(originalMethod: T): Method => {
		const debouncedByInstance = new WeakMap<object, ReturnType<typeof debounceFunction<T>>>();

		return function (this: object, ...args: Parameters<T>): void {
			let debounced = debouncedByInstance.get(this);

			if (!debounced) {
				debounced = debounceFunction((...innerArgs: Parameters<T>) => {
					return originalMethod.apply(this, innerArgs);
				}, timeout);
				debouncedByInstance.set(this, debounced);
			}

			debounced(...args);
		};
	};
}
