import type { RadiantElement } from '../../core/radiant-element';
import type { QueryConfig } from '../query';

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
export function query<T extends Element | Element[]>({
  cache: shouldBeCached = true,
  ...options
}: QueryConfig): (proto: RadiantElement, propertyName: string | symbol) => void {
  return (proto: RadiantElement, propertyKey: string | symbol) => {
    const privatePropertyKey = Symbol(`__${String(propertyKey)}__cache`);

    const selector = 'selector' in options ? options.selector : `[data-ref="${options.ref}"]`;

    const executeQuery = (instance: RadiantElement) => {
      let result: T | T[] = [];
      if (options?.all) {
        const queried = instance.querySelectorAll(selector);
        result = queried.length ? (Array.from(queried) as T) : [];
        return result;
      }

      return instance.querySelector(selector);
    };

    const originalConnectedCallback = proto.connectedCallback;

    proto.connectedCallback = function (this: RadiantElement) {
      Object.defineProperty(this, propertyKey, {
        get() {
          if (shouldBeCached) {
            if (!this[privatePropertyKey] || (options?.all && !this[privatePropertyKey].length)) {
              this[privatePropertyKey] = executeQuery(this);
            }
            return this[privatePropertyKey];
          }
          return executeQuery(this) as T;
        },
        enumerable: true,
        configurable: true,
      });
      originalConnectedCallback.call(this);
    };
  };
}
