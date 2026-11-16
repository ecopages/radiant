import type { RadiantElement } from '../../core/radiant-element';
import type { EventEmitterConfig } from '../../tools/event-emitter';
import { installEventField } from '../shared/event';
import { registerLegacyPostConstructionInitializer } from './instance-initializers';

export function event(eventConfig: EventEmitterConfig) {
	return (proto: RadiantElement, propertyKey: string) => {
		registerLegacyPostConstructionInitializer(
			proto,
			(element) => {
				installEventField(element, propertyKey, eventConfig);
			},
			propertyKey,
		);
	};
}
