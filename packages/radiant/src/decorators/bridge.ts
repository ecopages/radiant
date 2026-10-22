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

type FieldInitializer<Host, Value> = ((this: Host, value: Value) => Value) | void;

/**
 * A field decorator whose declared field owns the value type, so the options it was built from must agree with the field.
 *
 * @remarks
 * The legacy overload comes first. When no overload matches, TypeScript reports the last one, so a failed
 * standard-decorator check names the option and field types instead of `undefined` not matching the host.
 * Legacy mode never sees the field type, so it cannot reject a mismatch.
 *
 * This type and the host types it is built from are exported from the package entry points, because a
 * consumer's `declaration: true` emit names them in the type of every exported decorator result.
 * `test/types/declaration-emit` fails when one of them is not reachable.
 */
export type ValueFieldDecorator<Host, Value> = {
	(protoOrTarget: Host, name: string): void;
	<THost extends Host>(
		target: undefined,
		context: ClassFieldDecoratorContext<THost, Value>,
	): FieldInitializer<THost, Value>;
};

/** Builds a {@link ValueFieldDecorator} that dispatches on the shape of its second argument. */
export function fieldDecorator<Host extends object, Value>(
	standard: <THost extends Host>(
		target: undefined,
		context: ClassFieldDecoratorContext<THost, Value>,
	) => FieldInitializer<THost, Value>,
	legacy: LegacyFieldFn<Host, void>,
): ValueFieldDecorator<Host, Value> {
	return (protoOrTarget: Host | undefined, nameOrContext: string | ClassFieldDecoratorContext<Host, Value>) =>
		fieldDecoratorBridge(standard, legacy, protoOrTarget, nameOrContext);
}

/**
 * A field decorator that installs its own value, so the field may declare any subtype of `Bound`
 * and must be able to hold `Written`.
 *
 * @remarks
 * Kept apart from {@link ValueFieldDecorator}: a bound (`V extends Bound`) stops TypeScript from
 * inferring a factory's own type parameter from the field, so value decorators need the exact shape.
 * The legacy overload comes first for the same reason as in {@link ValueFieldDecorator}.
 *
 * `V extends X` cannot say "V is a supertype of X", and `ClassFieldDecoratorContext` reads `V` through
 * methods, which TypeScript compares in both directions. The `Written` check is a function-typed
 * `access.set`, which is compared strictly: the field's setter has to accept a `Written`. The default,
 * `never`, accepts any field, which is the bound alone.
 */
export type BoundedFieldDecorator<Host, Bound, Written = never> = {
	(protoOrTarget: Host, name: string): void;
	<THost extends Host, V extends Bound>(
		target: undefined,
		context: ClassFieldDecoratorContext<THost, V> & {
			readonly access: { readonly set: (object: never, value: Written) => void };
		},
	): void;
};

/** Builds a {@link BoundedFieldDecorator} that dispatches on the shape of its second argument. */
export function boundedFieldDecorator<Host extends object, Bound, Written = never>(
	standard: <THost extends Host, V extends Bound>(
		target: undefined,
		context: ClassFieldDecoratorContext<THost, V>,
	) => void,
	legacy: LegacyFieldFn<Host, void>,
): BoundedFieldDecorator<Host, Bound, Written> {
	return (protoOrTarget: Host | undefined, nameOrContext: string | ClassFieldDecoratorContext<Host, Bound>) =>
		fieldDecoratorBridge(standard, legacy, protoOrTarget, nameOrContext);
}

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
