import type { RadiantElement } from '../../core/radiant-element';

export function debounce(
	timeout: number,
): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	let timeoutRef: ReturnType<typeof setTimeout> | null = null;

	return (_target: RadiantElement, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor => {
		const originalMethod = descriptor.value;

		descriptor.value = function debounce(...args: any[]) {
			if (timeoutRef !== null) {
				clearTimeout(timeoutRef);
			}

			timeoutRef = setTimeout(() => {
				originalMethod.apply(this, args);
			}, timeout);
		};

		return descriptor;
	};
}
