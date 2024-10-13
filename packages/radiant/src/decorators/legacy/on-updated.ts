import type { RadiantElement } from '../../core/radiant-element';

/**
 * A decorator to subscribe to an updated callback when a reactive field or property changes.
 * @param eventConfig The event configuration.
 */
export function onUpdated(keyOrKeys: string | string[]) {
  return (target: RadiantElement, methodName: string) => {
    const originalConnectedCallback = target.connectedCallback;

    target.connectedCallback = function (this: RadiantElement) {
      const boundedMethod = (this as any)[methodName].bind(this);
      if (Array.isArray(keyOrKeys)) {
        for (const key of keyOrKeys) {
          (this as RadiantElement).registerUpdateCallback(key, boundedMethod);
        }
      } else if (typeof keyOrKeys === 'string') {
        (this as RadiantElement).registerUpdateCallback(keyOrKeys, boundedMethod);
      }
      originalConnectedCallback.call(this);
    };
  };
}
