import type { RadiantElement } from '../../core/radiant-element';
import { ContextRequestEvent } from '../events';
import type { UnknownContext } from '../types';

/**
 * A decorator to provide a context to the target element.
 * @param contextToProvide
 * @returns
 */
export function consumeContext(contextToProvide: UnknownContext) {
  return (proto: RadiantElement, propertyKey: string) => {
    const originalConnectedCallback = proto.connectedCallback;

    proto.connectedCallback = function (this: RadiantElement) {
      originalConnectedCallback.call(this);
      this.dispatchEvent(
        new ContextRequestEvent(contextToProvide, (context) => {
          (this as any)[propertyKey] = context;
          this.connectedContextCallback(contextToProvide);
        }),
      );
    };
  };
}
