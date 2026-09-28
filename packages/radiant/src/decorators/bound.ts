import type { Method } from '../types';
import type { RadiantElement } from '../core/radiant-element';
import { bound as legacyBound } from './legacy/bound';
import { bound as standardBound } from './standard/bound';
import { methodDecoratorBridge } from './bridge';

/**
 * A decorator to bind a method to the instance.
 */
export function bound<Host extends object, TMethod extends Method>(
	protoOrTarget: TMethod,
	nameOrContext: ClassMethodDecoratorContext<Host, TMethod>,
): void;
export function bound(
	protoOrTarget: RadiantElement,
	nameOrContext: string,
	descriptor: TypedPropertyDescriptor<Method>,
): TypedPropertyDescriptor<Method> | void;
export function bound(
	protoOrTarget: RadiantElement | Method,
	nameOrContext: string | ClassMethodDecoratorContext<RadiantElement, Method>,
	descriptor?: TypedPropertyDescriptor<Method>,
): TypedPropertyDescriptor<Method> | void {
	return methodDecoratorBridge(standardBound, legacyBound, protoOrTarget, nameOrContext, descriptor);
}
