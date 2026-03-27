import type { RadiantElement } from '../../../core/radiant-element';
import { bootstrapSsrConsumedContext, connectConsumedContext } from '../../context-consumer-bootstrap';
import type { UnknownContext } from '../../types';

export function consumeContext(contextToProvide: UnknownContext) {
	return <T extends RadiantElement, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) => {
		const contextName = String(context.name);
		const assignContextProvider = (host: T, provider: unknown) => {
			(host as any)[contextName] = provider;
		};

		context.addInitializer(function (this: T) {
			if (
				bootstrapSsrConsumedContext(
					this,
					contextToProvide,
					(provider) => {
						assignContextProvider(this, provider);
					},
					{ emitMounted: true },
				)
			) {
				return;
			}

			connectConsumedContext(
				this,
				contextToProvide,
				(provider) => {
					assignContextProvider(this, provider);
				},
				{ emitMounted: true },
			);
		});
	};
}
