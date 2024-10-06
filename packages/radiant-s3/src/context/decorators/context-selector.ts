import type { Method } from '../../types';
import { ContextSubscriptionRequestEvent } from '../events';
import type { Context, UnknownContext } from '../types';

type SubscribeToContextOptions<T extends UnknownContext> = {
  context: T;
  select?: (context: T['__context__']) => unknown;
  subscribe?: boolean;
};
/**
 * A decorator to subscribe to a context selector.
 * @param context The context to subscribe to.
 * @param selector The selector to subscribe to. If not provided, the whole context will be subscribed to.
 * @param subscribe @default true Whether to subscribe or unsubscribe. Optional.
 * @returns
 */
export function contextSelector<T extends Context<unknown, unknown>>({
  context,
  select,
  subscribe = true,
}: SubscribeToContextOptions<T>) {
  return function <T extends Method>(originalMethod: T, targetContext: ClassMethodDecoratorContext): void {
    targetContext.addInitializer(function (this: any) {
      this.dispatchEvent(new ContextSubscriptionRequestEvent(context, originalMethod.bind(this), select, subscribe));
    });
  };
}
