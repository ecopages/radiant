import type { EventEmitter, EventEmitterConfig } from '../tools/event-emitter';
import type { RadiantElement } from '../core/radiant-element';
import { event as legacyEvent } from './legacy/event';
import { event as standardEvent } from './standard/event';
import { boundedFieldDecorator, type BoundedFieldDecorator } from './bridge';

/**
 * Decorator that attaches an EventEmitter to the class field property.
 * The EventEmitter can be used to dispatch custom events from the target element.
 * @param eventConfig {@link EventEmitterConfig}  Configuration for the event emitter.
 * @see {@link EventEmitter} for more details about how the EventEmitter works.
 *
 * @remarks
 * The bound is `EventEmitter<never>`: `never` is assignable to every detail type, so a field of any
 * `EventEmitter<T>` satisfies it.
 */
export function event(eventConfig: EventEmitterConfig): BoundedFieldDecorator<RadiantElement, EventEmitter<never>> {
	return boundedFieldDecorator(standardEvent(eventConfig), legacyEvent(eventConfig));
}
