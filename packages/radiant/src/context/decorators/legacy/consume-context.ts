import type { RadiantElement } from '../../../core/radiant-element';
import { registerLegacyInstanceInitializer } from '../../../decorators/legacy/instance-initializers';
import { initializeConsumedContext, requestConsumedContext } from '../../context-consumer-runtime';
import type { UnknownContext } from '../../types';

export function consumeContext(contextToProvide: UnknownContext) {
	return (proto: RadiantElement, propertyKey: string) => {
		const tryInitializeConsumedContext = (element: RadiantElement) => {
			if ((element as any)[propertyKey]) {
				return true;
			}

			return initializeConsumedContext(element, contextToProvide, (provider) => {
				(element as any)[propertyKey] = provider;
			});
		};

		registerLegacyInstanceInitializer(proto, tryInitializeConsumedContext);
		const originalConnectedCallback = proto.connectedCallback;

		proto.connectedCallback = function (this: RadiantElement) {
			originalConnectedCallback.call(this);

			if (tryInitializeConsumedContext(this)) {
				return;
			}

			requestConsumedContext(this, contextToProvide, (provider) => {
				(this as any)[propertyKey] = provider;
			});
		};
	};
}
