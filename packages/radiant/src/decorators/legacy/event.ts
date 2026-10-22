import type { RadiantElement } from '../../core/radiant-element';
import { createEvent } from '../../helpers/create-event';
import type { EventEmitterConfig } from '../../tools/event-emitter';
import { registerLegacyInstanceInitializer } from './instance-initializers';

export function event(eventConfig: EventEmitterConfig) {
	return (proto: RadiantElement, propertyKey: string) => {
		registerLegacyInstanceInitializer(proto, (element) => {
			const emitter = createEvent(element, eventConfig);

			element.registerConnectedCallback(() => {
				Object.defineProperty(element, propertyKey, {
					get() {
						return emitter;
					},
					enumerable: true,
					configurable: true,
				});
			});
		});
	};
}
