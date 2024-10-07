import type { RadiantElement } from '../core/radiant-element';
import type { Method } from '../types';

/**
 * A decorator to subscribe to an updated callback when a reactive field or property changes.
 * @param eventConfig The event configuration.
 */
export function onUpdated(keyOrKeys: string | string[]) {
  return function <T extends Method>(originalMethod: T, context: ClassMethodDecoratorContext): void {
    context.addInitializer(function (this: any) {
      const boundMethod = originalMethod.bind(this);

      if (Array.isArray(keyOrKeys)) {
        for (const key of keyOrKeys) {
          (this as RadiantElement).addUpdateToRegistry(key, boundMethod);
        }
      } else if (typeof keyOrKeys === 'string') {
        (this as RadiantElement).addUpdateToRegistry(keyOrKeys, boundMethod);
      }
    });
  };
}
