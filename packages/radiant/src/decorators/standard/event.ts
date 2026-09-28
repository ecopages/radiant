import type { RadiantElement } from '../../core/radiant-element';
import { createEvent } from '../../helpers/create-event';
import type { EventEmitterConfig } from '../../tools/event-emitter';

/**
 * Decorator that attaches an EventEmitter to the class field property.
 * The EventEmitter can be used to dispatch custom events from the target element.
 * @param eventConfig Configuration for the event emitter.
 * @see {@link EventEmitter} for more details about how the EventEmitter works.
 */
export function event(eventConfig: EventEmitterConfig) {
	return function <T extends RadiantElement, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) {
		context.addInitializer(function (this: T) {
			const emitter = createEvent(this, eventConfig);

			Object.defineProperty(this, context.name, {
				get() {
					return emitter;
				},
				enumerable: true,
				configurable: true,
			});
		});
	};
}
