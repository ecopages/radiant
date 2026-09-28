import type { RadiantElement } from '../../core/radiant-element';
import { createEvent } from '../../helpers/create-event';
import type { EventEmitterConfig } from '../../tools/event-emitter';
import { registerLegacyInstanceInitializer } from './instance-initializers';

/**
 * Decorator that attaches an EventEmitter to the class field property.
 * The EventEmitter can be used to dispatch custom events from the target element.
 * @param eventConfig Configuration for the event emitter.
 * @see {@link EventEmitter} for more details about how the EventEmitter works.
 */
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
