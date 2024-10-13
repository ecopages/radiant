import type { RadiantElement } from '../../core/radiant-element';
import { EventEmitter, type EventEmitterConfig } from '../../tools/event-emitter';

const eventEmitters = new WeakMap();

/**
 * Decorator that attaches an EventEmitter to the class field property.
 * The EventEmitter can be used to dispatch custom events from the target element.
 * @param eventConfig Configuration for the event emitter.
 * @see {@link EventEmitter} for more details about how the EventEmitter works.
 */
export function event(eventConfig: EventEmitterConfig) {
  return (proto: RadiantElement, propertyKey: string) => {
    const originalConnectedCallback = proto.connectedCallback;
    proto.connectedCallback = function () {
      this.registerEventEmitter(eventConfig.name, new EventEmitter(this, eventConfig));

      Object.defineProperty(this, propertyKey, {
        get() {
          return this.eventEmitters.get(eventConfig.name);
        },
        enumerable: true,
        configurable: true,
      });
      originalConnectedCallback.call(this);
    };
  };
}
