import type { RadiantElement } from '../core/radiant-element';
import type { Method } from '../types';

/**
 * A decorator to subscribe to an updated callback when a reactive field or property changes.
 * @param eventConfig The event configuration.
 */
export function onUpdated(keyOrKeys: string | string[]) {
  return function <T extends Method>(_: T, context: ClassMethodDecoratorContext): void {
    context.addInitializer(function (this: any) {
      this[context.name] = this[context.name].bind(this);
      if (Array.isArray(keyOrKeys)) {
        for (const key of keyOrKeys) {
          (this as RadiantElement).addUpdateToRegistry(key, this[context.name]);
        }
      } else if (typeof keyOrKeys === 'string') {
        (this as RadiantElement).addUpdateToRegistry(keyOrKeys, this[context.name]);
      }
    });
  };
}
