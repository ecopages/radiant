import { fieldDecoratorBridge } from './bridge';
import { reactiveAttr as legacyReactiveAttr } from './legacy/attr';
import { reactiveAttr as standardReactiveAttr } from './standard/attr';
import type { ReactiveAttributeHostLike } from './shared/reactive-attr';
export type { AttrConverter, AttrOptions } from './shared/reactive-attr';

export function attr<TValue = string | undefined>(options: import('./shared/reactive-attr').AttrOptions<TValue> = {}) {
	function decorator<THost extends ReactiveAttributeHostLike>(
		protoOrTarget: undefined,
		nameOrContext: ClassFieldDecoratorContext<THost, TValue>,
	): (this: THost, value: TValue) => TValue;
	function decorator(protoOrTarget: ReactiveAttributeHostLike, nameOrContext: string): void;
	function decorator(
		protoOrTarget: ReactiveAttributeHostLike | undefined,
		nameOrContext: string | ClassFieldDecoratorContext<ReactiveAttributeHostLike, TValue>,
	): ((this: ReactiveAttributeHostLike, value: TValue) => TValue) | void {
		return fieldDecoratorBridge(
			standardReactiveAttr(options),
			legacyReactiveAttr(options),
			protoOrTarget,
			nameOrContext,
		);
	}

	return decorator;
}
