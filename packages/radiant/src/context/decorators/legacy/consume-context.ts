import type { ContextHostLike } from '../../context-host';
import { registerLegacyPostConstructionInitializer } from '../../../decorators/legacy/instance-initializers';
import { bootstrapSsrConsumedContext, connectConsumedContext } from '../../context-consumer-bootstrap';
import type { UnknownContext } from '../../types';

export function consumeContext(context: UnknownContext) {
	return (proto: ContextHostLike, propertyKey: string) => {
		const assignContextProvider = (element: ContextHostLike, provider: unknown) => {
			(element as any)[propertyKey] = provider;
		};
		const assigners = new WeakMap<ContextHostLike, (provider: unknown) => void>();
		const assignerFor = (element: ContextHostLike) => {
			let assign = assigners.get(element);
			if (!assign) {
				assign = (provider) => assignContextProvider(element, provider);
				assigners.set(element, assign);
			}
			return assign;
		};
		const initializeConsumedContextForHost = (element: ContextHostLike) => {
			if ((element as any)[propertyKey]) {
				return true;
			}

			return connectConsumedContext(element, context, assignerFor(element));
		};

		registerLegacyPostConstructionInitializer(proto, (element) => {
			bootstrapSsrConsumedContext(element, context, (provider) => {
				assignContextProvider(element, provider);
			});

			element.registerConnectedCallback(() => {
				if (initializeConsumedContextForHost(element)) {
					return;
				}

				queueMicrotask(() => {
					initializeConsumedContextForHost(element);
				});
			});
		});
	};
}
