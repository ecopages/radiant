import type { RadiantElement } from '../../../core/radiant-element';
import { registerLegacyInstanceInitializer } from '../../../decorators/legacy/instance-initializers';
import { bootstrapSsrConsumedContext, connectConsumedContext } from '../../context-consumer-bootstrap';
import type { UnknownContext } from '../../types';

export function consumeContext(contextToProvide: UnknownContext) {
	return (proto: RadiantElement, propertyKey: string) => {
		const assignContextProvider = (element: RadiantElement, provider: unknown) => {
			(element as any)[propertyKey] = provider;
		};
		const initializeConsumedContextForHost = (element: RadiantElement, options: { emitMounted?: boolean } = {}) => {
			if ((element as any)[propertyKey]) {
				return true;
			}

			return connectConsumedContext(
				element,
				contextToProvide,
				(provider) => {
					assignContextProvider(element, provider);
				},
				options,
			);
		};

		registerLegacyInstanceInitializer(proto, (element) => {
			bootstrapSsrConsumedContext(element, contextToProvide, (provider) => {
				assignContextProvider(element, provider);
			});
		});

		const originalConnectedCallback = proto.connectedCallback;

		proto.connectedCallback = function (this: RadiantElement) {
			originalConnectedCallback.call(this);

			if (initializeConsumedContextForHost(this, { emitMounted: true })) {
				return;
			}
		};
	};
}
