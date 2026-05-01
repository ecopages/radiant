import { type EventEmitterConfig } from '../tools/event-emitter';
import type { RadiantElement } from '../core/radiant-element';
import { event as legacyEvent } from './legacy/event';
import { event as standardEvent } from './standard/event';
import { fieldDecoratorBridge } from './bridge';

/**
 * Decorator that attaches an EventEmitter to the class field property.
 * The EventEmitter can be used to dispatch custom events from the target element.
 * @param eventConfig {@link EventEmitterConfig}  Configuration for the event emitter.
 * @see {@link EventEmitter} for more details about how the EventEmitter works.
 */
export function event(eventConfig: EventEmitterConfig) {
	function decorator<THost extends RadiantElement, TValue>(
		protoOrTarget: undefined,
		nameOrContext: ClassFieldDecoratorContext<THost, TValue>,
	): void;
	function decorator(protoOrTarget: RadiantElement, nameOrContext: string): void;
	function decorator(
		protoOrTarget: RadiantElement | undefined,
		nameOrContext: string | ClassFieldDecoratorContext<RadiantElement, unknown>,
	): void {
		return fieldDecoratorBridge(standardEvent(eventConfig), legacyEvent(eventConfig), protoOrTarget, nameOrContext);
	}

	return decorator;
}
