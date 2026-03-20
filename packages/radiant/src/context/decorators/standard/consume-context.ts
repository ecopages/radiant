import type { RadiantElement } from '../../../core/radiant-element';
import { initializeConsumedContext, requestConsumedContext } from '../../context-consumer-runtime';
import type { UnknownContext } from '../../types';

export function consumeContext(contextToProvide: UnknownContext) {
	return <T extends RadiantElement, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) => {
		const contextName = String(context.name);
		context.addInitializer(function (this: T) {
			if (
				initializeConsumedContext(
					this,
					contextToProvide,
					(provider) => {
						(this as any)[contextName] = provider;
					},
					{ emitMounted: true },
				)
			) {
				return;
			}

			requestConsumedContext(
				this,
				contextToProvide,
				(provider) => {
					(this as any)[contextName] = provider;
				},
				{ emitMounted: true },
			);
		});
	};
}
