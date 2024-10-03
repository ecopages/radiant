import type { RadiantElement } from '@/core';
import { EventEmitter, type EventEmitterConfig } from '../tools/event-emitter';

const eventEmitters = new WeakMap();

/**
 * Decorator that attaches an EventEmitter to the class field property.
 * The EventEmitter can be used to dispatch custom events from the target element.
 * @param eventConfig Configuration for the event emitter.
 * @see {@link EventEmitter} for more details about how the EventEmitter works.
 */
export function event(eventConfig: EventEmitterConfig) {
  return function <T extends RadiantElement, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) {
    const uniqueKey = Symbol(eventConfig.name);

    context.addInitializer(function (this: T) {
      Object.defineProperty(this, context.name, {
        get() {
          const emittersMap: Map<symbol, EventEmitter> = eventEmitters.get(this) || new Map();
          if (!emittersMap.has(uniqueKey)) {
            emittersMap.set(uniqueKey, new EventEmitter(this, eventConfig));
            eventEmitters.set(this, emittersMap);
          }

          return emittersMap.get(uniqueKey);
        },
        enumerable: true,
        configurable: true,
      });
    });
  };
}
