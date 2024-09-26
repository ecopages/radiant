import type { RadiantElement } from '@/core/radiant-element';

/**
 * A decorator to subscribe to an updated callback when a reactive field or property changes.
 * @param eventConfig The event configuration.
 */
export function onUpdated(keyOrKeys: string | string[]) {
  return (proto: RadiantElement, methodName: string) => {
    if (!('updatesRegistry' in proto)) {
      Object.defineProperty(proto, 'updatesRegistry', {
        value: new Map<string, Set<string>>(),
        configurable: true,
      });
    }

    const updatesRegistry = proto.updatesRegistry;

    if (Array.isArray(keyOrKeys)) {
      for (const key of keyOrKeys) {
        if (!updatesRegistry.has(key)) {
          updatesRegistry.set(key, new Set());
        }
        updatesRegistry.get(key)?.add(methodName);
      }
    } else if (typeof keyOrKeys === 'string') {
      if (!updatesRegistry.has(keyOrKeys)) {
        updatesRegistry.set(keyOrKeys, new Set());
      }
      updatesRegistry.get(keyOrKeys)?.add(methodName);
    }
  };
}
