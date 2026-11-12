import type { ContextHostLike } from '../../context-host';
import { bootstrapSsrConsumedContext, connectConsumedContext } from '../../context-consumer-bootstrap';
import type { ContextProvider } from '../../context-provider';
import type { UnknownContext } from '../../types';

export function consumeContext<C extends UnknownContext>(consumedContext: C) {
	return <T extends ContextHostLike, V extends ContextProvider<C> | undefined>(
		target: undefined,
		context: ClassFieldDecoratorContext<T, V>,
	) => {
		void target;
		const contextName = String(context.name);
		const assignContextProvider = (host: T, provider: unknown) => {
			const hostRecord = host as T & Record<string, unknown>;
			hostRecord[contextName] = provider;
		};
		const assigners = new WeakMap<T, (provider: unknown) => void>();
		const assignerFor = (host: T) => {
			let assign = assigners.get(host);
			if (!assign) {
				assign = (provider) => assignContextProvider(host, provider);
				assigners.set(host, assign);
			}
			return assign;
		};
		const initializeConsumedContextForHost = (host: T, options: { emitMounted?: boolean } = {}) => {
			const hostRecord = host as T & Record<string, unknown>;

			if (hostRecord[contextName]) {
				return true;
			}

			return connectConsumedContext(host, consumedContext, assignerFor(host), options);
		};

		context.addInitializer(function (this: T) {
			bootstrapSsrConsumedContext(
				this,
				consumedContext,
				(provider) => {
					assignContextProvider(this, provider);
				},
				{ emitMounted: true },
			);

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
