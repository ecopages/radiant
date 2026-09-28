import type { Method } from '../types';

type StandardFieldFn<Host extends object, Value, Result> = (
	target: undefined,
	context: ClassFieldDecoratorContext<Host, Value>,
) => Result;

type LegacyFieldFn<Proto, Result> = (proto: Proto, name: string) => Result;

type StandardMethodFn<Host extends object, TMethod extends Method, Result> = (
	target: TMethod,
	context: ClassMethodDecoratorContext<Host, TMethod>,
) => Result;

type LegacyMethodFn<Proto, Result> = (proto: Proto, name: string, descriptor: PropertyDescriptor) => Result;

function isMethod(value: unknown): value is Method {
	return typeof value === 'function';
}

export function fieldDecoratorBridge<Host extends object, Value, Result, Proto>(
	standard: StandardFieldFn<Host, Value, Result>,
	legacy: LegacyFieldFn<Proto, void>,
	protoOrTarget: undefined,
	nameOrContext: ClassFieldDecoratorContext<Host, Value>,
): Result;
export function fieldDecoratorBridge<Host extends object, Value, Proto, Result>(
	standard: StandardFieldFn<Host, Value, void>,
	legacy: LegacyFieldFn<Proto, Result>,
	protoOrTarget: Proto,
	nameOrContext: string,
): Result;
export function fieldDecoratorBridge<Host extends object, Value, StandardResult, Proto, LegacyResult>(
	standard: StandardFieldFn<Host, Value, StandardResult>,
	legacy: LegacyFieldFn<Proto, LegacyResult>,
	protoOrTarget: Proto | undefined,
	nameOrContext: string | ClassFieldDecoratorContext<Host, Value>,
): StandardResult | LegacyResult;

export function fieldDecoratorBridge(
	standard: StandardFieldFn<object, unknown, unknown>,
	legacy: LegacyFieldFn<unknown, unknown>,
	protoOrTarget: unknown,
	nameOrContext: string | ClassFieldDecoratorContext<object, unknown>,
): unknown {
	if (typeof nameOrContext === 'object') {
		return standard(undefined, nameOrContext);
	}

	return legacy(protoOrTarget, nameOrContext);
}

export function methodDecoratorBridge<Host extends object, TMethod extends Method, Result, Proto>(
	standard: StandardMethodFn<Host, TMethod, Result>,
	legacy: LegacyMethodFn<Proto, void>,
	protoOrTarget: TMethod,
	nameOrContext: ClassMethodDecoratorContext<Host, TMethod>,
	descriptor?: undefined,
): Result;
export function methodDecoratorBridge<Host extends object, TMethod extends Method, Proto, Result>(
	standard: StandardMethodFn<Host, TMethod, void>,
	legacy: LegacyMethodFn<Proto, Result>,
	protoOrTarget: Proto,
	nameOrContext: string,
	descriptor: PropertyDescriptor,
): Result;
export function methodDecoratorBridge<Host extends object, TMethod extends Method, StandardResult, Proto, LegacyResult>(
	standard: StandardMethodFn<Host, TMethod, StandardResult>,
	legacy: LegacyMethodFn<Proto, LegacyResult>,
	protoOrTarget: Proto | TMethod,
	nameOrContext: string | ClassMethodDecoratorContext<Host, TMethod>,
	descriptor?: PropertyDescriptor,
): StandardResult | LegacyResult;

export function methodDecoratorBridge(
	standard: StandardMethodFn<object, Method, unknown>,
	legacy: LegacyMethodFn<unknown, unknown>,
	protoOrTarget: unknown,
	nameOrContext: string | ClassMethodDecoratorContext<object, Method>,
	descriptor?: PropertyDescriptor,
): unknown {
	if (typeof nameOrContext === 'object') {
		if (!isMethod(protoOrTarget)) {
			throw new TypeError('Standard method decorators require a method target');
		}

		return standard(protoOrTarget, nameOrContext);
	}

	if (!descriptor) {
		throw new TypeError('Legacy method decorators require a property descriptor');
	}

	return legacy(protoOrTarget, nameOrContext, descriptor);
}
