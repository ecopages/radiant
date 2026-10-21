import type { Method } from '../../types';
import type { ContextHostLike } from '../context-host';

export type ContextUpdateMethod<Selected> = (value: Selected) => unknown;

/**
 * Dispatches context selector decorators to standard or legacy implementations.
 *
 * @remarks
 * Only the method forms check their target at runtime. A field form trusts the types, which already
 * reject a field the decorator cannot handle, such as a static field.
 */
export function dispatchContextSelectorDecorator<Selected>(
	standardField: (
		protoOrTarget: undefined,
		nameOrContext: ClassFieldDecoratorContext<ContextHostLike, Selected | undefined>,
	) => void,
	standardMethod: (
		protoOrTarget: Method,
		nameOrContext: ClassMethodDecoratorContext<ContextHostLike, ContextUpdateMethod<Selected>>,
	) => unknown,
	legacyField: (protoOrTarget: ContextHostLike, nameOrContext: string) => void,
	legacyMethod: (
		protoOrTarget: ContextHostLike,
		nameOrContext: string,
		descriptor: TypedPropertyDescriptor<ContextUpdateMethod<Selected>>,
	) => unknown,
	protoOrTarget: ContextHostLike | Method | undefined,
	nameOrContext:
		| string
		| ClassFieldDecoratorContext<ContextHostLike, Selected | undefined>
		| ClassMethodDecoratorContext<ContextHostLike, ContextUpdateMethod<Selected>>,
	descriptor?: TypedPropertyDescriptor<ContextUpdateMethod<Selected>>,
): TypedPropertyDescriptor<ContextUpdateMethod<Selected>> | void {
	if (typeof nameOrContext === 'object') {
		if (nameOrContext.kind === 'field') {
			return standardField(undefined, nameOrContext);
		}

		if (typeof protoOrTarget !== 'function') {
			throw new TypeError('@contextSelector standard method decorators require a method target');
		}

		return standardMethod(protoOrTarget, nameOrContext) as void;
	}

	if (descriptor) {
		if (typeof protoOrTarget === 'function' || protoOrTarget === undefined) {
			throw new TypeError('@contextSelector legacy method decorators require a host target');
		}

		return legacyMethod(protoOrTarget, nameOrContext, descriptor) as TypedPropertyDescriptor<
			ContextUpdateMethod<Selected>
		> | void;
	}

	return legacyField(protoOrTarget as ContextHostLike, nameOrContext);
}
