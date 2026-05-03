import type { Method } from '../types';
import { debounce as legacyDebounce } from './legacy/debounce';
import { debounce as standardDebounce } from './standard/debounce';
import { methodDecoratorBridge } from './bridge';

/**
 * A decorator to debounce a method.
 * @param timeout The debounce timeout in milliseconds.
 */
export function debounce(timeout: number) {
	function decorator<Host extends object, TMethod extends Method>(
		protoOrTarget: TMethod,
		nameOrContext: ClassMethodDecoratorContext<Host, TMethod>,
	): Method;
	function decorator(
		protoOrTarget: object,
		nameOrContext: string,
		descriptor: TypedPropertyDescriptor<Method>,
	): TypedPropertyDescriptor<Method> | void;
	function decorator(
		protoOrTarget: object | Method,
		nameOrContext: string | ClassMethodDecoratorContext<object, Method>,
		descriptor?: TypedPropertyDescriptor<Method>,
	): Method | TypedPropertyDescriptor<Method> | void {
		return methodDecoratorBridge(
			standardDebounce(timeout),
			legacyDebounce(timeout),
			protoOrTarget,
			nameOrContext,
			descriptor,
		);
	}

	return decorator;
}
