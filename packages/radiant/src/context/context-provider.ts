import type { RadiantElement } from '@/core/radiant-element';
import { type AttributeTypeConstant, readAttributeValue } from '@/utils/attribute-utils';
import {
  ContextEventsTypes,
  ContextOnMountEvent,
  type ContextRequestEvent,
  type ContextSubscription,
  type ContextSubscriptionRequestEvent,
} from './events';
import type { Context, ContextType, UnknownContext } from './types';

type ContextProviderOptions<T extends UnknownContext> = {
  context: UnknownContext;
  initialValue?: T['__context__'];
  hydrate?: AttributeTypeConstant;
};

export const HYDRATE_ATTRIBUTE = 'hydrate-context';

/**
 * Represents a context provider that allows setting and getting the context,
 * as well as subscribing to context updates.
 *
 * @template T - The type of the context.
 */
export interface IContextProvider<T extends Context<unknown, unknown>> {
  /**
   * Sets the context with the provided update and invokes the optional callback function.
   *
   * @param update - The partial update to be applied to the context.
   * @param callback - An optional callback function that receives the updated context.
   */
  setContext: (update: Partial<ContextType<T>>, callback?: (context: ContextType<T>) => void) => void;

  /**
   * Gets the current context.
   *
   * @returns The current context.
   */
  getContext: () => ContextType<T>;

  /**
   * Subscribes to context updates.
   *
   * @param subscription - The subscription object that defines the callback function to be invoked on context updates.
   */
  subscribe: (subscription: ContextSubscription<T>) => void;
}

/**
 * It creates a context provider that allows setting and getting the context,
 * It will also be in charge of notifying the subscribers when the context changes.
 *
 * @template T - The type of the context.
 * @implements IContextProvider
 *
 * @example
 * ```ts
 * export class MyElement extends RadiantElement {
 *  provider = new ContextProvider<typeof myContext>(this, {
 *    context: myContext,
 *    initialValue: {
 *      value: 'Hello World',
 *    },
 * });
 * ```
 */
export class ContextProvider<T extends Context<unknown, unknown>> implements IContextProvider<T> {
  private host: RadiantElement;
  private context: UnknownContext;
  private value: ContextType<T> | undefined;
  subscriptions: ContextSubscription<T>[] = [];

  /**
   * Creates a new instance of the ContextProvider.
   *
   * @param host - The host element that will contain the context provider.
   * @param options - The options to configure the context provider.
   */
  constructor(host: RadiantElement, options: ContextProviderOptions<T>) {
    this.host = host;
    this.context = options.context;
    let contextValue: T['__context__'] | undefined = options.initialValue;

    if (options.hydrate) {
      const hydrationValue = this.host.getAttribute(HYDRATE_ATTRIBUTE);

      if (hydrationValue) {
        const parsedHydrationValue = readAttributeValue(hydrationValue, options.hydrate) as ContextType<T>;
        this.host.removeAttribute(HYDRATE_ATTRIBUTE);

        if (
          options.hydrate === Object &&
          this.isObject(parsedHydrationValue) &&
          (this.isObject(contextValue) || typeof contextValue === 'undefined')
        ) {
          contextValue = {
            ...(contextValue ?? {}),
            ...parsedHydrationValue,
          };
        } else {
          contextValue = parsedHydrationValue;
        }
      }
    }

    this.value = contextValue as ContextType<T>;

    this.registerEvents();
    this.host.dispatchEvent(new ContextOnMountEvent(this.context));
  }

  setContext = (update: Partial<ContextType<T>>, callback?: (context: ContextType<T>) => void) => {
    if (typeof this.value === 'object') {
      const oldContext = { ...this.value };
      this.value = { ...this.value, ...update };
      if (callback) callback(this.value);
      this.notifySubscribers(this.value, oldContext);
    }
  };

  getContext = () => {
    return this.value as ContextType<T>;
  };

  subscribe = ({ select, callback }: ContextSubscription<T>) => {
    this.subscriptions.push({ select, callback });
  };

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && !Array.isArray(value) && value !== null;
  }

  private notifySubscribers = (newContext: ContextType<T>, prevContext: ContextType<T>) => {
    for (const sub of this.subscriptions) {
      if (!sub.select) return this.sendSubscriptionUpdate(sub, newContext);
      const newSelected = sub.select(newContext);
      const prevSelected = sub.select(prevContext);
      if (newSelected !== prevSelected) {
        this.sendSubscriptionUpdate(sub, newContext);
      }
    }
  };

  private sendSubscriptionUpdate = ({ select, callback }: ContextSubscription<T>, context: ContextType<T>) => {
    if (!select) callback(context);
    else callback(select(context));
  };

  private handleSubscriptionRequest = ({
    select,
    callback,
    subscribe,
  }: {
    select?: ContextSubscription<T>['select'];
    callback: ContextSubscription<T>['callback'];
    subscribe?: boolean;
  }) => {
    if (subscribe) this.subscribe({ select, callback });

    if (!this.value) return;

    if (select) {
      callback(select(this.value));
    } else {
      callback(this.value as ContextType<T>);
    }
  };

  private onSubscriptionRequest = (event: ContextSubscriptionRequestEvent<UnknownContext>) => {
    const { context, callback, subscribe, select, target } = event;
    if (context !== this.context) return;

    event.stopPropagation();

    (target as HTMLElement).dispatchEvent(new ContextOnMountEvent(this.context));

    this.handleSubscriptionRequest({ select, callback, subscribe });
  };

  private onContextRequest = (event: ContextRequestEvent<UnknownContext>) => {
    const { context, callback } = event;
    if (context !== this.context) return;
    event.stopPropagation();
    callback(this);
  };

  private registerEvents = () => {
    this.host.addEventListener(ContextEventsTypes.SUBSCRIPTION_REQUEST, this.onSubscriptionRequest);
    this.host.addEventListener(ContextEventsTypes.CONTEXT_REQUEST, this.onContextRequest);
  };
}
