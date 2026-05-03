import type { ContextHostLike } from '../../context-host';
import { registerLegacyInstanceInitializer } from '../../../decorators/legacy/instance-initializers';
import { bootstrapSsrConsumedContext, connectConsumedContext } from '../../context-consumer-bootstrap';
import type { UnknownContext } from '../../types';

export function consumeContext(context: UnknownContext) {
	return (proto: ContextHostLike, propertyKey: string) => {
		const assignContextProvider = (element: ContextHostLike, provider: unknown) => {
			(element as any)[propertyKey] = provider;
		};
		const initializeConsumedContextForHost = (
			element: ContextHostLike,
			options: { emitMounted?: boolean } = {},
		) => {
			if ((element as any)[propertyKey]) {
				return true;
			}

			return connectConsumedContext(
				element,
				context,
				(provider) => {
					assignContextProvider(element, provider);
				},
				options,
			);
		};

		registerLegacyInstanceInitializer(proto, (element) => {
			bootstrapSsrConsumedContext(element, context, (provider) => {
				assignContextProvider(element, provider);
			});

			element.registerConnectedCallback(() => {
				if (initializeConsumedContextForHost(element, { emitMounted: true })) {
					return;
				}

				queueMicrotask(() => {
					initializeConsumedContextForHost(element, { emitMounted: true });
				});
			});
		});
	};
}
