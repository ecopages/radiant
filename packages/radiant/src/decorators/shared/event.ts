import type { RadiantElement } from '../../core/radiant-element';
import { createEvent } from '../../helpers/create-event';
import type { EventEmitterConfig } from '../../tools/event-emitter';

/**
 * Installs the `@event` emitter getter on a host.
 *
 * @remarks
 * Standard adapters run this from `addInitializer`. Legacy adapters run it from post-construction so
 * class-field definition does not overwrite the getter.
 */
export function installEventField(host: RadiantElement, propertyName: string | symbol, eventConfig: EventEmitterConfig): void {
	const emitter = createEvent(host, eventConfig);

	Object.defineProperty(host, propertyName, {
		get() {
			return emitter;
		},
		enumerable: true,
		configurable: true,
	});
}
