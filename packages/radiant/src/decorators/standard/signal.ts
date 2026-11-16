import type { WritableSignal } from '@ecopages/signals';
import type { ReactiveHostLike } from '../../core/reactive-host';
import { installHostSignal } from '../shared/signal';
import type { SignalDecoratorOptions } from '../shared/signal-options';

export function signal<Value = unknown>(options: SignalDecoratorOptions<Value> = {}) {
	return function <T extends ReactiveHostLike>(
		_: undefined,
		context: ClassFieldDecoratorContext<T, WritableSignal<Value>>,
	) {
		const propertyName = String(context.name);

		return function (this: T, initialValue: Value | WritableSignal<Value>): WritableSignal<Value> {
			return installHostSignal(this, propertyName, options, initialValue);
		};
	};
}
