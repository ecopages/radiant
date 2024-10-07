import type { RadiantElement } from '../../core/radiant-element';
import { ContextEventsTypes, ContextRequestEvent } from '../events';
import type { UnknownContext } from '../types';

/**
 * A decorator to provide a context to the target element.
 * @param contextToProvide
 * @returns
 */
export function consumeContext(contextToProvide: UnknownContext) {
  return <T extends RadiantElement, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) => {
    const contextName = String(context.name);
    context.addInitializer(function (this: T) {
      this.dispatchEvent(
        new ContextRequestEvent(contextToProvide, (context) => {
          (this as any)[contextName] = context;
          this.connectedContextCallback(contextToProvide);
          this.dispatchEvent(new CustomEvent(ContextEventsTypes.MOUNTED, { detail: context }));
        }),
      );
    });
  };
}
