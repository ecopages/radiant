import type { RadiantElement } from '../../core/radiant-element';
import type { AttributeTypeConstant } from '../../utils/attribute-utils';
import { ContextProvider } from '../context-provider';
import type { UnknownContext } from '../types';

type CreateContextOptions<T extends UnknownContext> = {
  context: T;
  initialValue?: T['__context__'];
  hydrate?: AttributeTypeConstant;
};

/**
 * A decorator to provide a context to the target element.
 * @param contextToProvide
 * @returns
 */
export function provideContext<T extends UnknownContext>({ context, initialValue, hydrate }: CreateContextOptions<T>) {
  return <C extends RadiantElement, V>(_: undefined, targetContext: ClassFieldDecoratorContext<C, V>) => {
    const contextName = String(targetContext.name);
    targetContext.addInitializer(function (this: C) {
      (this as any)[contextName] = new ContextProvider<T>(this, { context, initialValue, hydrate });
      this.connectedContextCallback(context);
    });

    return function (this: C) {
      return (this as any)[contextName];
    };
  };
}
