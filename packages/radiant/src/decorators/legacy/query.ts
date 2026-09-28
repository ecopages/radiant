import { createQuery } from '../../helpers/create-query';
import type { QueryConfig } from '../query';
import { registerLegacyInstanceInitializer } from './instance-initializers';

type QueryDecoratorInstance = (Element | { host: Element }) & {
	registerConnectedCallback(callback: () => void): void;
};

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
}: QueryConfig): (proto: QueryDecoratorInstance, propertyName: string | symbol) => void {
	return (proto: QueryDecoratorInstance, propertyKey: string | symbol) => {
		registerLegacyInstanceInitializer(proto, (element) => {
			element.registerConnectedCallback(() => {
				const accessor = createQuery<T>(element, {
					cache: shouldBeCached,
					...options,
				});

				Object.defineProperty(element, propertyKey, {
					get() {
						return accessor.value;
					},
					enumerable: true,
					configurable: true,
				});
			});
		});
	};
}
