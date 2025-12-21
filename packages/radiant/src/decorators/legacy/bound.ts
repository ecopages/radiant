import type { RadiantElement } from '../../core/radiant-element';

/**
 * A decorator to bind a method to the instance.
 * @param target {@link RadiantElement}
 * @param propertyKey string
 * @param descriptor {@link PropertyDescriptor}
 * @returns
 */
export function bound(target: RadiantElement, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
	const originalMethod = descriptor.value;

	return {
		configurable: true,
		get() {
			if (this === (target as any).prototype || Object.hasOwn(this, propertyKey)) {
				return originalMethod;
			}

			const boundMethod = originalMethod.bind(this);
			Object.defineProperty(this, propertyKey, {
				value: boundMethod,
				configurable: true,
				writable: true,
			});
			return boundMethod;
		},
	};
}
