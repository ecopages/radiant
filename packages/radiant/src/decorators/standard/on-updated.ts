import type { RadiantElement } from '../../core/radiant-element';
import type { Method } from '../../types';

export function onUpdated(keyOrKeys: string | string[]) {
  return function <T extends Method>(_: T, context: ClassMethodDecoratorContext): void {
    context.addInitializer(function (this: any) {
      this[context.name] = this[context.name].bind(this);
      if (Array.isArray(keyOrKeys)) {
        for (const key of keyOrKeys) {
          (this as RadiantElement).registerUpdateCallback(key, this[context.name]);
        }
      } else if (typeof keyOrKeys === 'string') {
        (this as RadiantElement).registerUpdateCallback(keyOrKeys, this[context.name]);
      }
    });
  };
}
