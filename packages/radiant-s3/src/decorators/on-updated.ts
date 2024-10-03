import type { RadiantElement } from '@/core/radiant-element';
import type { Method } from '..';

/**
 * A decorator to subscribe to an updated callback when a reactive field or property changes.
 * @param eventConfig The event configuration.
 */
export function onUpdated(keyOrKeys: string | string[]) {
  return function <T extends Method>(originalMethod: T, context: ClassMethodDecoratorContext): void {
    context.addInitializer(function (this: any) {
      const boundMethod = originalMethod.bind(this);

      if (!('updatesRegistry' in this)) {
        Object.defineProperty(this, 'updatesRegistry', {
          value: new Map<string, Set<string>>(),
          configurable: true,
        });
      }

      const updatesRegistry = (this as RadiantElement).updatesRegistry;

      if (Array.isArray(keyOrKeys)) {
        for (const key of keyOrKeys) {
          if (!updatesRegistry.has(key)) {
            updatesRegistry.set(key, new Set());
          }
          updatesRegistry.get(key)?.add(boundMethod);
        }
      } else if (typeof keyOrKeys === 'string') {
        if (!updatesRegistry.has(keyOrKeys)) {
          updatesRegistry.set(keyOrKeys, new Set());
        }
        updatesRegistry.get(keyOrKeys)?.add(boundMethod);
      }

      console.log('updatesRegistry', updatesRegistry);
    });
  };
}
