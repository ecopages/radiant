import type { RadiantElement } from '../../core/radiant-element';
import { createEvent } from '../../helpers/create-event';
import type { EventEmitter, EventEmitterConfig } from '../../tools/event-emitter';

export function event(eventConfig: EventEmitterConfig) {
	return function <T extends RadiantElement, V extends EventEmitter<never>>(
		_: undefined,
		context: ClassFieldDecoratorContext<T, V>,
	) {
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
