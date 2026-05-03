import type { ContextHostLike } from '../../context-host';
import { bootstrapSsrConsumedContext, connectConsumedContext } from '../../context-consumer-bootstrap';
import type { UnknownContext } from '../../types';

export function consumeContext(consumedContext: UnknownContext) {
	return <T extends ContextHostLike, V>(target: undefined, context: ClassFieldDecoratorContext<T, V>) => {
		void target;
		const contextName = String(context.name);
		const assignContextProvider = (host: T, provider: unknown) => {
			const hostRecord = host as T & Record<string, unknown>;
			hostRecord[contextName] = provider;
		};
		const initializeConsumedContextForHost = (host: T, options: { emitMounted?: boolean } = {}) => {
			const hostRecord = host as T & Record<string, unknown>;

			if (hostRecord[contextName]) {
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
