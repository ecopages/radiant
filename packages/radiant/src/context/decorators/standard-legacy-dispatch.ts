import type { Method } from '../../types';
import type { ContextHostLike } from '../context-host';

/**
 * Dispatches context selector decorators to standard or legacy implementations.
 */
export function dispatchContextSelectorDecorator<Selected>(
	standardField: (protoOrTarget: undefined, nameOrContext: ClassFieldDecoratorContext<ContextHostLike, Selected>) => unknown,
	standardMethod: (protoOrTarget: Method, nameOrContext: ClassMethodDecoratorContext<ContextHostLike, (value: Selected) => unknown>) => unknown,
	legacyField: (protoOrTarget: ContextHostLike, nameOrContext: string) => unknown,
	legacyMethod: (
		protoOrTarget: ContextHostLike,
		nameOrContext: string,
		descriptor: TypedPropertyDescriptor<(value: Selected) => unknown>,
	) => unknown,
	protoOrTarget: ContextHostLike | Method | undefined,
	nameOrContext:
		| string
		| ClassFieldDecoratorContext<ContextHostLike, Selected>
		| ClassMethodDecoratorContext<ContextHostLike, (value: Selected) => unknown>,
	descriptor?: TypedPropertyDescriptor<(value: Selected) => unknown>,
):
	| ((this: ContextHostLike, initialValue: Selected) => Selected)
	| TypedPropertyDescriptor<(value: Selected) => unknown>
	| void {
	if (typeof nameOrContext === 'object') {
		if (nameOrContext.kind === 'field') {
			if (protoOrTarget !== undefined) {
				throw new TypeError('@contextSelector field decorators require an undefined target');
			}

			return standardField(undefined, nameOrContext) as (this: ContextHostLike, initialValue: Selected) => Selected;
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

		return legacyMethod(protoOrTarget, nameOrContext, descriptor) as
			| TypedPropertyDescriptor<(value: Selected) => unknown>
			| void;
	}

	if (typeof protoOrTarget === 'function' || protoOrTarget === undefined) {
		throw new TypeError('@contextSelector legacy field decorators require a host target');
	}

	return legacyField(protoOrTarget, nameOrContext) as void;
}
