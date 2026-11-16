import type { RadiantElement } from '../../core/radiant-element';
import type { EventEmitter, EventEmitterConfig } from '../../tools/event-emitter';
import { installEventField } from '../shared/event';

export function event(eventConfig: EventEmitterConfig) {
	return function <T extends RadiantElement, V extends EventEmitter<never>>(
		_: undefined,
		context: ClassFieldDecoratorContext<T, V>,
	) {
		context.addInitializer(function (this: T) {
			installEventField(this, context.name, eventConfig);
		});
	};
}
