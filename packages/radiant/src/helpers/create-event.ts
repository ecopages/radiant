import type { RadiantElement } from '../core/radiant-element';
import { EventEmitter, type EventEmitterConfig } from '../tools/event-emitter';

/**
 * Creates an EventEmitter bound to a host element and registers it on the host.
 * Functional equivalent of the `@event` decorator for vanilla JS usage.
 * @param host The host element that will dispatch the events.
 * @param config {@link EventEmitterConfig} The event emitter configuration.
 */
export function createEvent<T = unknown>(host: RadiantElement, config: EventEmitterConfig): EventEmitter<T> {
	const emitter = new EventEmitter<T>(host, config);
	host.registerEventEmitter(config.name, emitter);
	return emitter;
}
