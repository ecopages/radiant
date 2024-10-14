import type { RadiantElement } from '../../../core/radiant-element';
import { ContextSubscriptionRequestEvent } from '../../events';
import type { Context, ContextType, UnknownContext } from '../../types';
import type { SubscribeToContextOptions } from '../context-selector';

type ArgsType<T extends UnknownContext> = SubscribeToContextOptions<T>['select'] extends (...args: any[]) => infer R
  ? R
  : ContextType<T>;

export function contextSelector<T extends Context<unknown, unknown>>({
  context,
  select,
  subscribe = true,
}: SubscribeToContextOptions<T>) {
  return (proto: RadiantElement, _: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const originalConnectedCallback = proto.connectedCallback;

    proto.connectedCallback = function (this: RadiantElement) {
      originalConnectedCallback.call(this);
      this.dispatchEvent(new ContextSubscriptionRequestEvent(context, originalMethod.bind(this), select, subscribe));
    };

    descriptor.value = function (...args: ArgsType<T>[]) {
      const result = originalMethod.apply(this, args);
      return result;
    };

    return descriptor;
  };
}
