import type { RadiantElement } from '@/core';

/**
 * The base configuration object for the query.
 */
type BaseQueryConfig = {
  all?: boolean;
  cache?: boolean;
};

/**
 * The configuration object for the query.
 * It can be configured to query by CSS selector or data-ref attribute.
 */
export type QueryConfig = BaseQueryConfig &
  (
    | {
        selector: string;
      }
    | {
        ref: string;
      }
  );

/**
 * A decorator to query by CSS selector or data-ref attribute.
 * By default it queries for the first element that matches the selector, but it can be configured to query for all elements.
 *
 * @param {QueryConfig} options - The configuration object for the query.
 * @param {boolean} [options.all] - A flag to query for all elements that match the selector. Defaults to `false`.
 * @param {boolean} [options.cache] - A flag to cache the query result. Defaults to `true`.
 * @param {string} [options.selector] - A CSS selector to match elements against. This property is mutually exclusive with `options.ref`.
 * @param {string} [options.ref] - A reference to an element. This property is mutually exclusive with `options.selector`.
 *
 * @returns {Function} A decorator function that, when applied to a class property, will replace it with a getter. The getter will return the result of the query when accessed.
 *
 * @example
 * class MyElement extends HTMLElement {
 *   @query({ selector: '.my-class' })
 *   myElement;
 * }
 *
 * // Now, `myElement` will return the first element in the light DOM of `MyElement` that matches the selector '.my-class'.
 */
export function query({
  cache: shouldBeCached = true,
  ...options
}: QueryConfig): (proto: RadiantElement, propertyKey: string | symbol) => void {
  const cache = new WeakMap<Element, Element | NodeList | null>();

  return (proto: RadiantElement, propertyKey: string | symbol) => {
    const doQuery = function (this: Element) {
      if (shouldBeCached) {
        const cachedResult = cache.get(this);
        if (cachedResult !== undefined) {
          return cachedResult;
        }
      }

      const selector = 'selector' in options ? options.selector : `[data-ref="${options.ref}"]`;
      const queryResult = options.all ? this.querySelectorAll(selector) : this.querySelector(selector);

      if (shouldBeCached) {
        cache.set(this, queryResult);
      }

      return queryResult;
    };

    const originalConnectedCallback = proto.connectedCallback;

    proto.connectedCallback = function (this: RadiantElement) {
      Object.defineProperty(this, propertyKey, {
        get: doQuery,
        enumerable: true,
        configurable: true,
      });

      originalConnectedCallback.call(this);
    };
  };
}
