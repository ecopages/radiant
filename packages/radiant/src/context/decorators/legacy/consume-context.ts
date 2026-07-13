import type { ContextHostLike } from '../../context-host';
import { registerLegacyPostConstructionInitializer } from '../../../decorators/legacy/instance-initializers';
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

		registerLegacyPostConstructionInitializer(proto, (element) => {
			if (
				bootstrapSsrConsumedContext(element, context, (provider) => {
					assignContextProvider(element, provider);
				})
			) {
				return;
			}

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
