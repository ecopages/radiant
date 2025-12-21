import { type EventEmitterConfig } from '../tools/event-emitter';
import type {
	LegacyFieldDecoratorArgs,
	StandardFieldDecoratorArgs,
	StandardOrLegacyFieldDecoratorArgs,
} from '../types';
import { event as legacyEvent } from './legacy/event';
import { event as standardEvent } from './standard/event';

/**
 * Decorator that attaches an EventEmitter to the class field property.
 * The EventEmitter can be used to dispatch custom events from the target element.
 * @param eventConfig {@link EventEmitterConfig}  Configuration for the event emitter.
 * @see {@link EventEmitter} for more details about how the EventEmitter works.
 */
export function event(eventConfig: EventEmitterConfig) {
	return function (
		protoOrTarget: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'],
		nameOrContext: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
	): any {
		if (typeof nameOrContext === 'object') {
			return standardEvent(eventConfig)(
				protoOrTarget as StandardFieldDecoratorArgs['protoOrTarget'],
				nameOrContext as StandardFieldDecoratorArgs['nameOrContext'],
			);
		}
		return legacyEvent(eventConfig)(
			protoOrTarget as LegacyFieldDecoratorArgs['protoOrTarget'],
			nameOrContext as LegacyFieldDecoratorArgs['nameOrContext'],
		);
	};
}
