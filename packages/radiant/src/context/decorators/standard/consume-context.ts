import type { RadiantElement } from '../../../core/radiant-element';
import { bootstrapSsrConsumedContext, connectConsumedContext } from '../../context-consumer-bootstrap';
import type { UnknownContext } from '../../types';

export function consumeContext(consumedContext: UnknownContext) {
	return <T extends RadiantElement, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) => {
		const contextName = String(context.name);
		const assignContextProvider = (host: T, provider: unknown) => {
			(host as any)[contextName] = provider;
		};
		const initializeConsumedContextForHost = (host: T, options: { emitMounted?: boolean } = {}) => {
			if ((host as any)[contextName]) {
				return true;
			}

			return connectConsumedContext(
				host,
				consumedContext,
				(provider) => {
					assignContextProvider(host, provider);
				},
				options,
			);
		};

		context.addInitializer(function (this: T) {
			if (
				bootstrapSsrConsumedContext(
					this,
					consumedContext,
					(provider) => {
						assignContextProvider(this, provider);
					},
					{ emitMounted: true },
				)
			) {
				return;
			}

			this.registerConnectedCallback(() => {
				if (initializeConsumedContextForHost(this, { emitMounted: true })) {
					return;
				}

				queueMicrotask(() => {
					initializeConsumedContextForHost(this, { emitMounted: true });
				});
			});
		});
	};
}
